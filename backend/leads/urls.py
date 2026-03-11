"""
URL configuration for leads app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QALeadViewSet, ProductionLeadViewSet, PostCallSummaryViewSet, vapi_webhook, custom_kb_search, sync_inbound_calls

router = DefaultRouter()
router.register(r'qa-leads', QALeadViewSet, basename='qa-lead')
router.register(r'production-leads', ProductionLeadViewSet, basename='production-lead')
router.register(r'post-call-summaries', PostCallSummaryViewSet, basename='post-call-summary')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/vapi/', vapi_webhook, name='vapi-webhook'),
    path('kb/search/', custom_kb_search, name='custom-kb-search'),
    path('sync-inbound-calls/', sync_inbound_calls, name='sync-inbound-calls'),
]
