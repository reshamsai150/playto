from rest_framework import viewsets, status, generics, permissions, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate, login
from django.contrib.contenttypes.models import ContentType
from django.db import transaction, IntegrityError
from .models import Post, Comment, Like
from .serializers import (
    UserSerializer, PostSerializer, CommentSerializer, 
    CommentTreeSerializer, LikeSerializer
)
from .services import CommentService, LeaderboardService

class AuthView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        if 'username' in request.data: # Register
             serializer = UserSerializer(data=request.data)
             if serializer.is_valid():
                 user = serializer.save()
                 login(request, user)
                 return Response(serializer.data, status=status.HTTP_201_CREATED)
             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return Response(UserSerializer(user).data)
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        if request.method == 'POST':
            # Create a comment on this post
            post = self.get_object()
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(author=request.user, post=post)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # GET: return comment tree
        roots = CommentService.get_comment_tree(pk)
        serializer = CommentTreeSerializer(roots, many=True)
        return Response(serializer.data)

class CommentViewSet(viewsets.GenericViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        parent = self.get_object()
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(author=request.user, post=parent.post, parent=parent)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Expects: object_id, content_type (post/comment)
        object_id = request.data.get('object_id')
        type_str = request.data.get('type') # 'post' or 'comment'
        
        if not object_id or not type_str:
            return Response({'detail': 'Missing data'}, status=status.HTTP_400_BAD_REQUEST)

        model_class = Post if type_str == 'post' else Comment
        try:
            content_type = ContentType.objects.get_for_model(model_class)
            obj = model_class.objects.get(id=object_id)
        except (ContentType.DoesNotExist, model_class.DoesNotExist):
            return Response({'detail': 'Object not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            with transaction.atomic():
                Like.objects.create(
                    user=request.user,
                    content_type=content_type,
                    object_id=obj.id,
                    content_object=obj
                )
                # Increment counter
                obj.like_count += 1
                obj.save(update_fields=['like_count'])
                
            return Response({'success': True}, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response({'detail': 'Already liked'}, status=status.HTTP_400_BAD_REQUEST)

class LeaderboardView(views.APIView):
    def get(self, request):
        top_users = LeaderboardService.get_top_users()
        return Response(top_users)
