# Technical Explainer

## 1. Nested Comments (The Tree)

### Database Choice: Adjacency List
We used a simple **Adjacency List** pattern where each `Comment` stores a `parent_id` pointing to its immediate parent.

**Why?**
- **Flexibility:** Allows infinite nesting depth without complex table migrations (unlike Nested Sets).
- **Simplicity:** Write operations (inserting a reply) are O(1) and trivial.

### Efficient Fetching (Avoiding N+1)
A naive approach (fetch post -> fetch comments -> for each comment, fetch replies) results in the N+1 problem, causing hundreds of DB queries for a single thread.

**Our Solution:**
1.  **Single Query:** We fetch **all** comments for a post in exactly one SQL query:
    ```sql
    SELECT * FROM core_comment WHERE post_id = [ID] ORDER BY created_at;
    ```
2.  **In-Memory Tree Construction:**
    - We iterate through the flat list once (`O(N)`) to create a lookup map.
    - We iterate again (`O(N)`) to attach child comments to their parents' `replies_list`.
    - This transforms the linear data into a tree structure in Python, keeping DB load constant (`O(1)` query per request).

## 2. Leaderboard Logic (The Math)

The leaderboard calculates the top 5 users based on interacting received in the last 24 hours.

**Scoring Weights:**
- **Post Like:** 5 Karma
- **Comment Like:** 1 Karma

### Query Optimization
Instead of iterating through users in Python (which would be slow), we use Django's aggregation capabilities to compute the score in the database.

**The Query:**
```python
# Service Layer
Like.objects.filter(created_at__gte=last_24h)
    .values('receiver')  # Group by the user who RECEIVED the like
    .annotate(
        karma=Sum(
            Case(
                When(content_type=post_ct, then=Value(5)),     # Post Like
                When(content_type=comment_ct, then=Value(1)),  # Comment Like
                default=Value(0),
                output_field=IntegerField()
            )
        )
    )
    .order_by('-karma')[:5]
```
This processes thousands of likes in milliseconds using highly optimized database grouping and summation.

## 3. AI Audit

**Scenario:**
During the implementation of the leaderboard, the AI initially suggested a solution that looked like this:

**Bad AI Code (Inefficient):**
```python
# AI's Initial Suggestion
users = User.objects.all()
leaderboard = []
for user in users:
    score = 0
    # N+1 Queries here!
    post_likes = Like.objects.filter(receiver=user, content_type=post_ct, created_at__gte=last_24h).count()
    comment_likes = Like.objects.filter(receiver=user, content_type=comment_ct, created_at__gte=last_24h).count()
    score = (post_likes * 5) + (comment_likes * 1)
    leaderboard.append({'user': user, 'score': score})
```

**The Issue:**
This code ignores scalability. It fetches *every* user and runs two count queries *per user*. For 1,000 users, this would trigger 2,001 database queries.

**The Fix:**
I rejected this and implemented the aggregation query shown in Section 2, which returns the result in a **single** efficient query regardless of user count.
