# Institution Registration Status Fix

## Problem
Previously, when institution admins registered through the invite system, their institutions would not appear as "registered" to students. This was because the `InstitutionRegistrationSerializer` created `Institution` records without linking them to existing `MasterInstitution` records, which are used to determine registration status in the student-facing interface.

## Solution Implemented

### 1. Automatic Linking During Registration

**File Modified:** `authentication/serializers.py`

Added automatic linking functionality to the `InstitutionRegistrationSerializer`:

- **Fuzzy String Matching**: Uses `difflib.SequenceMatcher` to find similar institution names
- **Type Matching Boost**: Institutions with matching types get a similarity boost
- **85% Similarity Threshold**: Only links institutions with high confidence matches
- **Exact Match Priority**: Exact name matches are prioritized over fuzzy matches
- **Comprehensive Logging**: All linking attempts are logged for audit purposes

### 2. Management Command for Existing Data

**File Created:** `institutions/management/commands/sync_master_institutions.py`

A Django management command to sync existing `Institution` records with `MasterInstitution` records:

```bash
# Dry run to see what would be linked
python manage.py sync_master_institutions --dry-run

# Apply the linking
python manage.py sync_master_institutions

# Custom similarity threshold
python manage.py sync_master_institutions --similarity-threshold 0.90

# Force re-linking of already linked institutions
python manage.py sync_master_institutions --force
```

### 3. Enhanced Admin Interface

**File Modified:** `institutions/admin.py`

Enhanced Django admin interface with:

- **Master Institution Management**: Full CRUD operations for `MasterInstitution` records
- **Linking Status Visualization**: Clear indication of which institutions are linked
- **Bulk Auto-Linking Action**: Admin action to automatically link selected institutions
- **Cross-Reference Navigation**: Easy navigation between linked records
- **Filtering and Search**: Enhanced filtering by linking status

### 4. Comprehensive Testing

**File Created:** `institutions/tests/test_auto_linking.py`

Test suite covering:

- Exact name matching
- Fuzzy string matching
- Type-based similarity boosting
- No-match scenarios
- Case-insensitive matching

## How It Works

### Registration Flow

1. **Admin Registration**: Institution admin registers through invite system
2. **Name Analysis**: System analyzes the provided institution name
3. **Master Institution Search**: Searches for matching `MasterInstitution` records
4. **Automatic Linking**: If a good match is found (≥85% similarity), automatically links
5. **Status Update**: Institution immediately appears as "registered" to students
6. **Audit Logging**: All actions are logged for security and audit purposes

### Matching Algorithm

```python
def _find_matching_master_institution(self, institution_name, institution_type):
    # 1. Try exact match first
    exact_match = MasterInstitution.objects.filter(
        name__iexact=institution_name.strip()
    ).first()
    
    # 2. Use fuzzy matching with similarity scoring
    for master_inst in MasterInstitution.objects.all():
        similarity = SequenceMatcher(None, 
            institution_name.lower().strip(), 
            master_inst.name.lower().strip()
        ).ratio()
        
        # 3. Boost score for matching institution types
        if institution_type.lower() in master_inst.institution_type.lower():
            similarity += 0.1
        
        # 4. Return best match above threshold
        if similarity >= 0.85:
            return master_inst
```

## Usage Instructions

### For System Administrators

1. **Sync Existing Data**:
   ```bash
   python manage.py sync_master_institutions --dry-run
   python manage.py sync_master_institutions
   ```

2. **Monitor Linking in Admin**:
   - Go to Django Admin → Institutions → Institutions
   - Use the "Master Institution" filter to see unlinked institutions
   - Use the "Auto-link selected institutions" action for bulk linking

3. **Manual Linking**:
   - Edit individual Institution records
   - Use the "master_institution" field to manually link
   - Use raw_id_fields for easy searching

### For Developers

1. **Testing**: Run the test suite to verify functionality
2. **Monitoring**: Check SecurityEvent logs for linking activities
3. **Customization**: Adjust similarity threshold in serializer if needed

## Benefits

1. **Immediate Status Updates**: New institutions appear as registered immediately
2. **Backward Compatibility**: Existing institutions can be synced retroactively
3. **High Accuracy**: 85% similarity threshold ensures reliable matching
4. **Audit Trail**: Complete logging of all linking activities
5. **Admin Friendly**: Easy management through Django admin interface
6. **Flexible**: Manual override capabilities for edge cases

## Configuration

### Similarity Threshold
The default similarity threshold is 85%. To adjust:

```python
# In InstitutionRegistrationSerializer._find_matching_master_institution
if similarity >= 0.85:  # Adjust this value
```

### Logging Level
Linking activities are logged as 'low' severity SecurityEvents. Monitor these for:
- Successful automatic linking
- Failed matching attempts
- Manual linking activities

## Monitoring and Maintenance

1. **Regular Sync**: Run the sync command periodically for any missed institutions
2. **Review Unlinked**: Regularly check admin for institutions without master_institution links
3. **Audit Logs**: Monitor SecurityEvent logs for linking patterns and issues
4. **Data Quality**: Ensure MasterInstitution data is kept up-to-date through web scraping

This fix ensures that the institution registration status is accurately reflected across the entire system, providing a seamless experience for students while maintaining data integrity and audit capabilities.