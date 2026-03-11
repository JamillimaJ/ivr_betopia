"""
ASGI config for lead_qualifier project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lead_qualifier.settings')

application = get_asgi_application()
