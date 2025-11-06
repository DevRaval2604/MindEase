from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import Resource
from .serializers import ResourceSerializer
from .pagination import ResourcePagination

class ResourceListView(ListAPIView):
    """
    GET /api/resources/?q=stress&type=article&page=1&page_size=9
    - q: search text (title/description)
    - type: article | video | pdf
    """
    permission_classes = [AllowAny]
    serializer_class = ResourceSerializer
    pagination_class = ResourcePagination

    def get_queryset(self):
        qs = Resource.objects.all()
        params = self.request.query_params

        q = (params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        rtype = (params.get("type") or "").strip().lower()
        if rtype in ("article", "video", "pdf"):
            qs = qs.filter(resource_type=rtype)

        return qs.order_by("-created_at")
