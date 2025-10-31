# Docker Build Instructions

## If Docker build fails with "Cannot find name 'handleDeleteUser'"

This error occurs when Docker uses cached layers from before the fix was applied.

### Solution: Rebuild without cache

```bash
# Rebuild Docker image without cache
docker build --no-cache -t tradetron-token-generator .

# Or if using docker-compose
docker-compose build --no-cache
docker-compose up -d
```

### Alternative: Clear Docker cache

```bash
# Remove all build cache
docker builder prune -a

# Then rebuild
docker build -t tradetron-token-generator .
```

### Verify latest code is pulled

If deploying from a git repository, ensure the latest code is pulled:

```bash
# Pull latest changes
git pull origin main

# Then rebuild
docker build --no-cache -t tradetron-token-generator .
```

### Check Dockerfile is updated

The Dockerfile now includes:
1. Playwright browser installation step
2. Proper build order
3. .dockerignore file excludes unnecessary files

The fix for `handleDeleteUser` is already committed and pushed to GitHub.
The local build works perfectly - the Docker issue is just caching.

