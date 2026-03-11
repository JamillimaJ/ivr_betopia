"""
WSGI config for lead_qualifier project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lead_qualifier.settings')

application = get_wsgi_application()
