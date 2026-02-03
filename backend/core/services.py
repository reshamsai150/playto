from django.db.models import Sum, Case, When, Value, IntegerField
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import timedelta
from .models import Comment, Like, Post

class CommentService:
    @staticmethod
    def get_comment_tree(post_id):
        """
        Fetches all comments for a post and builds a nested tree in Python.
        Avoids N+1 queries by fetching all comments in one go.
        """
        # Fetch all comments for the post, optimized with select_related if needed
        # We need author info for serialization usually
        comments = Comment.objects.filter(post_id=post_id).select_related('author').order_by('created_at')
        
        comment_map = {}
        roots = []

        # First pass: map ID to comment object and initialize children
        for comment in comments:
            # We'll attach a temporary 'replies_list' attribute
            comment.replies_list = []
            comment_map[comment.id] = comment

        # Second pass: build the tree
        for comment in comments:
            if comment.parent_id:
                parent = comment_map.get(comment.parent_id)
                if parent:
                    parent.replies_list.append(comment)
                else:
                    # Parent might be deleted or missing (shouldn't happen with CASCADE)
                    roots.append(comment)
            else:
                roots.append(comment)
        
        return roots

class LeaderboardService:
    @staticmethod
    def get_top_users(limit=5):
        """
        Returns top users by karma earned in the last 24 hours.
        Karma: Post Like = 5, Comment Like = 1.
        """
        last_24h = timezone.now() - timedelta(hours=24)
        
        post_ct = ContentType.objects.get_for_model(Post)
        comment_ct = ContentType.objects.get_for_model(Comment)

        # Aggregate karma per receiver
        # We use the 'receiver' field on Like which we added for this exact purpose
        top_users = (
            Like.objects.filter(created_at__gte=last_24h)
            .values('receiver', 'receiver__username') # Group by receiver
            .annotate(
                karma=Sum(
                    Case(
                        When(content_type=post_ct, then=Value(5)),
                        When(content_type=comment_ct, then=Value(1)),
                        default=Value(0),
                        output_field=IntegerField()
                    )
                )
            )
            .order_by('-karma')[:limit]
        )
        
        return list(top_users)
