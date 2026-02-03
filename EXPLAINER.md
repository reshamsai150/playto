# System Design Explainer

## 1. Comment Tree Optimization
**Requirement:** Unlimited nesting, No N+1 queries.
**Solution:** Adjacency List with Python-side assembly.
- **Data Model:** `Comment` has `parent_id`.
- **Query:** `Comment.objects.filter(post_id=X)` fetches ALL comments in 1 SQL query.
- **Assembly:** Python O(N) loop builds the tree structure using a hash map (`id -> comment`).
- **Why?** Recursive CTEs are complex in primitive SQLite/Django ORM. MPTT is heavy on writes. This hybrid approach is best for read-heavy feeds with moderate comment volumes per post.

## 2. Leaderboard & Likes
**Requirement:** Rolling 24h window, Dynamic calculation, High concurrency.
**Solution:**
- **Atomics:** `Like` creation is wrapped in `transaction.atomic()` with `unique_together` constraints to prevent double-likes.
- **Rolling Window:** We query `Like` table directly filtering `created_at >= NOW - 24h`. We do NOT store `daily_karma` on User (as per requirements).
- **Optimization:** Added `receiver` field to `Like` model.
    - *Problem:* `Like` points to `Post` OR `Comment`. Grouping by "Author of the Liked Object" requires complex Joins across multiple tables (Polymorphic).
    - *Fix:* When a Like is saved, we populate a direct FK `receiver` to the User who owns the content. This allows a simple aggregation: `Like.objects.filter(last_24h).values('receiver').annotate(sum)`.

## 3. Auth & MVP Trade-offs
- **CSRF:** Disabled for prototype speed (`CORS_ALLOW_CREDENTIALS=True` + Remove Middleware). In production, implementing Double-Submit Cookie pattern is required.
- **Deployment:** Structure is ready for Dockerization. SQLite can be swapped for PostgreSQL via `settings.py`.
