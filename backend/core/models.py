from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    like_count = models.IntegerField(default=0)

    def __str__(self):
        return f"Post by {self.author.username} at {self.created_at}"

class Comment(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    like_count = models.IntegerField(default=0)  # Added for consistency and performance

    def __str__(self):
        return f"Comment by {self.author.username} on Post {self.post.id}"

class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes_given')
    
    # Polymorphic relation
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Denormalized field for Leaderboard query efficiency (as per plan)
    # This stores who RECEIVED the like.
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes_received')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'content_type', 'object_id')
        indexes = [
            models.Index(fields=['created_at']), # For rolling window query
            models.Index(fields=['receiver', 'created_at']), # For leaderboard
        ]

    def save(self, *args, **kwargs):
        # Auto-populate receiver on save
        if not self.receiver_id:
            try:
                self.receiver = self.content_object.author
            except AttributeError:
                pass # Should not happen if content_object has author
        super().save(*args, **kwargs)
