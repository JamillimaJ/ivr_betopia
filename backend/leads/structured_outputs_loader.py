"""
Structured Outputs Loader
Loads structured output IDs from a JSON configuration file
"""
import json
import os
from pathlib import Path


class StructuredOutputsLoader:
    """Load and manage structured output IDs from JSON config"""
    
    def __init__(self, config_file=None):
        """
        Initialize the loader with a config file path
        
        Args:
            config_file: Path to the JSON config file. If None, reads from env var
        """
        if config_file is None:
            config_file = os.getenv('STRUCTURED_OUTPUTS_CONFIG', 'structured_outputs_old_account.json')
        
        # Get the project root (go up from backend/leads/)
        project_root = Path(__file__).resolve().parent.parent.parent
        self.config_path = project_root / config_file
        
        self.ids = {}
        self._load_config()
    
    def _load_config(self):
        """Load structured output IDs from the JSON file"""
        if not self.config_path.exists():
            print(f"⚠️  Warning: Structured outputs config not found: {self.config_path}")
            print(f"   Using empty IDs. All extractions will return N/A.")
            return
        
        try:
            with open(self.config_path, 'r') as f:
                data = json.load(f)
            
            # Extract IDs from the "structured_outputs" array (old account format)
            if 'structured_outputs' in data:
                for output in data['structured_outputs']:
                    name = output.get('name', '').lower().replace(' ', '_')
                    self.ids[name] = output.get('id')
            
            # Also check for IDs in "ids_in_current_code" (new account format)
            if 'ids_in_current_code' in data:
                for name, uuid in data['ids_in_current_code'].items():
                    if name != 'status' and name != 'reason':
                        self.ids[name] = uuid
            
            print(f"✅ Loaded {len(self.ids)} structured output IDs from: {self.config_path.name}")
            
        except Exception as e:
            print(f"❌ Error loading structured outputs config: {e}")
    
    def get_id(self, field_name):
        """
        Get the UUID for a structured output field
        
        Args:
            field_name: The field name (e.g., 'service_interest', 'motivation')
        
        Returns:
            The UUID string or None if not found
        """
        return self.ids.get(field_name.lower())
    
    def get_all_ids(self):
        """Get all loaded IDs as a dictionary"""
        return self.ids.copy()
    
    def has_field(self, field_name):
        """Check if a field exists in the config"""
        return field_name.lower() in self.ids
    
    def reload(self):
        """Reload the configuration from file"""
        self.ids = {}
        self._load_config()


# Create a singleton instance
_loader = None
_inbound_loader = None

def get_structured_outputs_loader(config_file=None):
    """Get or create a loader instance. Pass config_file to get a specific loader."""
    global _loader, _inbound_loader
    if config_file is not None:
        # Return a dedicated loader for this config (cached per file)
        if config_file == os.getenv('INBOUND_STRUCTURED_OUTPUTS_CONFIG', 'structured_outputs_inbound.json'):
            if _inbound_loader is None:
                _inbound_loader = StructuredOutputsLoader(config_file)
            return _inbound_loader
        return StructuredOutputsLoader(config_file)
    if _loader is None:
        _loader = StructuredOutputsLoader()
    return _loader


def reload_structured_outputs():
    """Reload the structured outputs configuration"""
    global _loader
    if _loader is not None:
        _loader.reload()
    else:
        _loader = StructuredOutputsLoader()
