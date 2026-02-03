from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post, Comment, Like
from django.contrib.contenttypes.models import ContentType

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Comment
        fields = ('id', 'author', 'content', 'created_at', 'parent', 'like_count')
        read_only_fields = ('author', 'like_count')

class CommentTreeSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'author', 'content', 'created_at', 'like_count', 'replies')

    def get_replies(self, obj):
        # The service layer attaches 'replies_list' to the object
        if hasattr(obj, 'replies_list'):
            return CommentTreeSerializer(obj.replies_list, many=True).data
        return []

class PostSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Post
        fields = ('id', 'author', 'content', 'created_at', 'like_count')
        read_only_fields = ('author', 'like_count')

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ('id', 'object_id', 'created_at')
