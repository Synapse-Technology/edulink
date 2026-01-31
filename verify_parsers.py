import os
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "edulink.settings")
try:
    django.setup()
except Exception as e:
    print(f"Setup failed: {e}")
    sys.exit(1)

from edulink.apps.students.views import StudentViewSet
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

try:
    # Access the decorated action method
    # In DRF, the action decorator adds attributes to the function
    # But when accessed via the class, it might be the unbound function.
    # The parser_classes are stored in kwargs of the decorator, 
    # but typically DRF views store them in the viewset or the action method attributes.
    
    # Actually, @action stores data in the 'kwargs' attribute of the method
    update_profile_method = StudentViewSet.update_profile
    
    # The @action decorator sets these attributes
    parsers = update_profile_method.parser_classes
    
    print(f"Parsers found: {parsers}")
    
    if JSONParser in parsers:
        print("SUCCESS: JSONParser is present in update_profile parsers.")
    else:
        print("FAILURE: JSONParser is MISSING.")

except AttributeError:
    print("Could not access parser_classes on update_profile. It might not be decorated correctly.")
except Exception as e:
    print(f"An error occurred: {e}")
