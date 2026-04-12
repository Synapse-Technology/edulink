# React Component Template - Best Practices & Patterns

**Purpose**: Pre-configured template with all error handling, type safety, date formatting, and accessibility patterns already in place.

**Usage**: Copy this template as a starting point for new components, then replace the placeholder logic with your specific requirements.

---

## 📋 StudentComponentTemplate.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { [RouteIcon] } from 'lucide-react';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { dateFormatter } from '../../utils/dateFormatter';
import type { [YourType] } from '../../types/[your-domain]';
import StudentLoadingSkeleton from '../../components/student/skeletons/StudentLoadingSkeleton';

interface ComponentState {
  data: [YourType][] | null;
  loading: boolean;
  error: string | null;
}

const StudentComponent: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Main state management
  const [state, setState] = useState<ComponentState>({
    data: null,
    loading: true,
    error: null
  });

  // Suppress unused warning if needed
  useEffect(() => {
    void user;
  }, [user]);

  // Initialize data fetch
  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Fetch data with error handling
   * Always use this pattern for API calls
   */
  const fetchData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // TODO: Replace with your API call
      // const data = await yourService.getData();
      const data = []; // placeholder
      
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (err) {
      const message = getErrorMessage(err, { action: 'Load Data' });
      showToast.error(message);
      logError(err, { action: 'Load Data' });
      setState(prev => ({ ...prev, error: message, loading: false }));
    }
  };

  /**
   * Handle item action
   * Template for async operations
   */
  const handleAction = async (itemId: string) => {
    try {
      showToast.loading('Processing...');
      
      // TODO: Replace with your business logic
      // await yourService.performAction(itemId);
      
      showToast.success('Action completed successfully!');
      
      // Refresh data if needed
      await fetchData();
    } catch (err) {
      const message = getErrorMessage(err, { 
        action: 'Perform Action',
        context: 'on item'
      });
      showToast.error(message);
      logError(err, { 
        action: 'Perform Action',
        data: { itemId }
      });
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div 
      className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`}
      style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}
    >
      {/* Sidebar & Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div 
        className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`}
        style={{ zIndex: 1040, width: '280px' }}
      >
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
      >
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Content */}
        {state.loading ? (
          <StudentLoadingSkeleton isDarkMode={isDarkMode} />
        ) : state.error ? (
          <div className="flex-grow-1 px-4 px-lg-5 pb-4 d-flex align-items-center justify-content-center text-center">
            <div>
              <h3 className="mb-3">⚠️ Unable to Load</h3>
              <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>{state.error}</p>
              <button 
                className="btn btn-primary mt-3"
                onClick={() => fetchData()}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !state.data || state.data.length === 0 ? (
          <div className="flex-grow-1 px-4 px-lg-5 pb-4 d-flex align-items-center justify-content-center text-center">
            <div>
              <div className={`p-4 rounded-circle d-inline-flex mb-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                <[RouteIcon] size={48} className="text-muted opacity-50" />
              </div>
              <h4 className="fw-bold mb-3">No Data Found</h4>
              <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                You don't have any items yet. Create your first one to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-grow-1 px-4 px-lg-5 pb-5">
            {/* Page Header */}
            <div className="mb-5">
              <h2 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`}>
                Your Items
              </h2>
              <p className={isDarkMode ? 'text-light opacity-50' : 'text-muted'}>
                Manage your items here.
              </p>
            </div>

            {/* Main Content */}
            <div className={`card border-0 shadow-sm rounded-4 ${isDarkMode ? 'bg-dark border border-secondary' : 'bg-white'}`}>
              <div className="card-body p-4 p-lg-5">
                {state.data.map((item) => (
                  <div key={item.id} className={`p-4 rounded-3 mb-3 d-flex justify-content-between align-items-center ${isDarkMode ? 'bg-secondary bg-opacity-10 border border-secondary' : 'bg-light'}`}>
                    <div>
                      <div className="fw-bold">{item.name || 'Item'}</div>
                      <div className="small text-muted">
                        {dateFormatter.shortDate(item.created_at || new Date())}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleAction(item.id)}
                      aria-label={`Perform action on ${item.name || 'item'}`}
                      title="Perform action"
                    >
                      Action
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentComponent;
```

---

## 🎯 Pre-Configured Features

### ✅ 1. Error Handling
```typescript
// Every catch block uses this pattern:
const message = getErrorMessage(err, { action: 'Action Name' });
showToast.error(message);
logError(err, { action: 'Action Name', data?: {...} });
```

### ✅ 2. Type Safety
```typescript
// Proper types imported and used
import type { YourType } from '../../types/your-domain';
const [data, setState] = useState<YourType | null>(null);
```

### ✅ 3. Date Formatting
```typescript
// Centralized date formatting
import { dateFormatter } from '../../utils/dateFormatter';
dateFormatter.shortDate(date)  // "Jan 15, 2026"
dateFormatter.relativeTime(date) // "2 hours ago"
```

### ✅ 4. Accessibility
```typescript
<button
  aria-label="Descriptive label for screen readers"
  title="Tooltip with full description"
  disabled={isLoading}
  aria-busy={isLoading}
>
  Action
</button>
```

### ✅ 5. Loading States
```typescript
{loading ? (
  <Skeleton />
) : error ? (
  <ErrorUI />
) : emptyData ? (
  <EmptyStateUI />
) : (
  <ContentUI />
)}
```

### ✅ 6. Mobile Responsive
```typescript
// Mobile menu toggle included
// Proper sidebar margin on desktop
// Responsive padding (px-4 px-lg-5)
```

---

## 🚀 How to Use This Template

1. **Copy the template** to a new file: `StudentNewComponent.tsx`

2. **Replace placeholders**:
   - `[RouteIcon]` → use appropriate lucide icon
   - `[YourType]` → import your type definition
   - `[your-domain]` → replace with domain folder
   - `your-service` → use your API service

3. **Customize sections**:
   - Update the fetchData() with your API call
   - Modify handleAction() with your business logic
   - Adjust the UI/grid structure as needed

4. **Run tests**:
   ```bash
   npm run build
   ```

---

## 📋 Checklist for New Components

Before submitting a new component:

- [ ] Import `getErrorMessage` and `logError`
- [ ] Import `dateFormatter` for all date displays
- [ ] Import proper types (never use `any`)
- [ ] Add ARIA labels to interactive elements
- [ ] Add loading, error, and empty states
- [ ] Use error handler pattern in all catch blocks
- [ ] Add context to error logging
- [ ] Component compiles without TypeScript errors
- [ ] Responsive on mobile (sidebar + menu toggle)

---

## 🔗 Reference Links

- **Error Handling**: `src/utils/errorMapper.ts`
- **Date Formatting**: `src/utils/dateFormatter.ts`
- **Types**: `src/types/`
- **Services**: `src/services/`
- **Context**: `src/contexts/`
- **Utilities**: `src/utils/`

---

## 💡 Tips

1. **Keep error messages user-friendly** - Use `getErrorMessage()` which handles status codes
2. **Always log context** - Include action and relevant data in `logError()`
3. **Consistent dates** - Never use `toLocaleDateString()` directly, use `dateFormatter`
4. **Accessibility first** - Add aria-label to all buttons, title for tooltips
5. **Handle edge cases** - Check for null/undefined before rendering

---

## ❌ Anti-Patterns (Don't Do This)

```typescript
// ❌ WRONG: Generic error message
catch (err) {
  showToast.error('Something went wrong');
}

// ✅ CORRECT:
catch (err) {
  const message = getErrorMessage(err, { action: 'Load Data' });
  showToast.error(message);
}

// ❌ WRONG: Using any type
const [data, setData] = useState<any>(null);

// ✅ CORRECT:
const [data, setData] = useState<SpecificType | null>(null);

// ❌ WRONG: Inline date formatting
new Date(date).toLocaleDateString(...)

// ✅ CORRECT:
dateFormatter.shortDate(date)

// ❌ WRONG: Button without accessibility attributes
<button onClick={handleClick}>Do Something</button>

// ✅ CORRECT:
<button onClick={handleClick} aria-label="Description" title="Tooltip">
  Do Something
</button>
```

---

**Version**: 1.0  
**Updated**: April 11, 2026  
**Maintained by**: Frontend Team
