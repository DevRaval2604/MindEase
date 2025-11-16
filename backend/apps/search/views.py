from decimal import Decimal, InvalidOperation
from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from apps.accounts.models import CounsellorProfile
from .serializers import CounsellorSearchSerializer
from .pagination import StandardResultsSetPagination
from rest_framework.decorators import api_view
from apps.accounts.models import Specialization, AvailabilitySlot
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

@api_view(['GET'])
@permission_classes([AllowAny])
def list_specializations(request):
    qs = Specialization.objects.all().values('id', 'name')
    return Response(qs)

@api_view(['GET'])
@permission_classes([AllowAny])
def list_availability(request):
    qs = AvailabilitySlot.objects.all().values('id', 'name')
    return Response(qs)

class CounsellorSearchView(ListAPIView):
    """
    GET /api/search/counsellors/
    Query params:
      - q              : search string for first_name/last_name/email
      - specialization : comma-separated specialization NAMES (e.g. Anxiety,Depression)
      - min_fee        : decimal
      - max_fee        : decimal
      - ordering       : fees_asc | fees_desc | name_asc | name_desc
      - page, page_size for pagination
    """
    serializer_class = CounsellorSearchSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (
            CounsellorProfile.objects
            .select_related("user")
            .prefetch_related("specializations", "availability")
            .filter(user__is_active=True)
        )

        params = self.request.query_params

        # name / email search
        q = (params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
                | Q(user__email__icontains=q)
            )

        # specialization filter (accepts comma-separated NAMES, case-insensitive)
        spec = (params.get("specialization") or "").strip()
        if spec:
            names = [s.strip() for s in spec.split(",") if s.strip()]
            if names:
                # build OR queries using case-insensitive exact match for each name
                name_q = Q()
                for name in names:
                    name_q |= Q(specializations__name__iexact=name)
                qs = qs.filter(name_q)

        # fee range
        min_fee = params.get("min_fee")
        max_fee = params.get("max_fee")
        try:
            if min_fee:
                qs = qs.filter(fees_per_session__gte=Decimal(min_fee))
            if max_fee:
                qs = qs.filter(fees_per_session__lte=Decimal(max_fee))
        except (InvalidOperation, ValueError):
            return qs.none()

        # ordering
        ordering = (params.get("ordering") or "").lower()
        if ordering == "fees_asc":
            qs = qs.order_by("fees_per_session")
        elif ordering == "fees_desc":
            qs = qs.order_by("-fees_per_session")
        elif ordering == "name_desc":
            qs = qs.order_by("-user__first_name", "-user__last_name")
        else:
            qs = qs.order_by("user__first_name", "user__last_name")

        return qs.distinct()
