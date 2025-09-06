# Branch Merge Strategies & Integration Workflows

## Edulink Internship Management Platform - Beta Version 1.0

### Git Workflow Overview

---

## Branch Structure

### Primary Branches

#### 1. **main** (Production Branch)
- **Purpose:** Production-ready code
- **Protection:** Highly protected, requires PR approval
- **Deployment:** Auto-deploys to production
- **Merge Policy:** Only from `dev` branch via PR
- **Access:** Team Lead (Bouric) has merge rights

#### 2. **dev** (Development Integration Branch)
- **Purpose:** Integration of all feature branches
- **Protection:** Protected, requires PR approval
- **Testing:** All tests must pass before merge
- **Merge Policy:** From feature branches via PR
- **Access:** Senior developers can merge

### Feature Branches

#### Current Active Branches

##### **feature/application**
- **Owner:** Caroline Obuya (Backend Developer)
- **Purpose:** Application processing system
- **Components:**
  - Application models and logic
  - Application API endpoints
  - Application status tracking
  - Student application workflow

##### **feature/auth**
- **Owner:** Duncan Mathai (Authentication & Security Engineer)
- **Purpose:** Authentication and security systems
- **Components:**
  - JWT authentication
  - Role-based access control
  - Security middleware
  - User session management

##### **feature/dashboards**
- **Owner:** Mark Matheka (Data Engineer)
- **Purpose:** Analytics and dashboard systems
- **Components:**
  - Data visualization
  - Performance metrics
  - Business intelligence reports
  - Real-time analytics

##### **feature/employers**
- **Owner:** Caroline Obuya (Backend Developer)
- **Purpose:** Employer management system
- **Components:**
  - Employer profiles
  - Company management
  - Internship posting
  - Employer dashboard

---

## Merge Strategies

### 1. **Feature Branch to Dev** (Standard Workflow)

#### Pre-Merge Checklist
```bash
# 1. Ensure feature branch is up to date
git checkout feature/your-feature
git pull origin dev
git rebase dev  # or merge dev into feature branch

# 2. Run all tests
python manage.py test
python manage.py test --settings=Edulink.settings.test

# 3. Check code quality
flake8 .
black --check .
isort --check-only .

# 4. Security scan (if applicable)
python manage.py check --deploy
```

#### Merge Process
1. **Create Pull Request**
   - Target: `dev` branch
   - Title: Clear, descriptive title
   - Description: Detailed change description
   - Link related issues

2. **Code Review Process**
   - **Primary Reviewer:** Feature owner
   - **Secondary Reviewer:** Team lead (Bouric)
   - **Security Review:** Duncan (for auth/security changes)
   - **UI Review:** Gabriella (for frontend changes)

3. **Automated Checks**
   - All tests pass
   - Code coverage maintained
   - No security vulnerabilities
   - Performance benchmarks met

4. **Merge Execution**
   ```bash
   # Squash and merge (preferred for feature branches)
   git checkout dev
   git merge --squash feature/your-feature
   git commit -m "feat: add feature description"
   git push origin dev
   ```

### 2. **Dev to Main** (Release Workflow)

#### Pre-Release Checklist
- [ ] All feature branches merged and tested
- [ ] Integration tests pass
- [ ] Performance tests pass
- [ ] Security audit complete
- [ ] Documentation updated
- [ ] Release notes prepared

#### Release Process
1. **Create Release Branch**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b release/v1.0.0
   ```

2. **Final Testing**
   - Full regression testing
   - User acceptance testing
   - Performance validation
   - Security verification

3. **Merge to Main**
   ```bash
   # Create PR from release branch to main
   # After approval and final checks:
   git checkout main
   git merge --no-ff release/v1.0.0
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin main --tags
   ```

4. **Post-Release**
   ```bash
   # Merge back to dev
   git checkout dev
   git merge main
   git push origin dev
   
   # Delete release branch
   git branch -d release/v1.0.0
   git push origin --delete release/v1.0.0
   ```

---

## Integration Workflows

### Daily Integration Process

#### Morning Sync (9:00 AM)
```bash
# Each developer updates their feature branch
git checkout feature/your-feature
git fetch origin
git rebase origin/dev

# Resolve any conflicts
# Run tests to ensure everything works
python manage.py test
```

#### Evening Integration (5:00 PM)
```bash
# If feature is ready for integration
git checkout feature/your-feature
git push origin feature/your-feature

# Create PR to dev branch
# Follow code review process
```

### Weekly Integration Cycle

#### Monday: Planning & Branch Creation
- Sprint planning meeting
- Create new feature branches
- Assign branch ownership
- Set integration targets

#### Tuesday-Thursday: Development
- Active development on feature branches
- Daily sync with dev branch
- Continuous testing
- Code reviews

#### Friday: Integration & Testing
- Merge completed features to dev
- Integration testing
- Performance validation
- Prepare for weekend deployment

---

## Conflict Resolution

### Common Conflict Scenarios

#### 1. **Database Migration Conflicts**
```bash
# When migration numbers conflict
python manage.py makemigrations --merge
# Review and test the merged migration
python manage.py migrate
```

#### 2. **Model Changes Conflicts**
- **Resolution:** Coordinate with team lead
- **Process:** 
  1. Identify conflicting changes
  2. Discuss with affected developers
  3. Create unified solution
  4. Update both branches

#### 3. **Settings Conflicts**
- **Resolution:** Use environment-specific settings
- **Process:**
  1. Move conflicting settings to environment files
  2. Use base settings for common configuration
  3. Update deployment configuration

### Conflict Resolution Process

1. **Identify Conflict**
   ```bash
   git status
   git diff
   ```

2. **Analyze Changes**
   - Understand both versions
   - Identify business impact
   - Consult with relevant developers

3. **Resolve Conflict**
   ```bash
   # Edit conflicted files
   # Test resolution
   git add .
   git commit -m "resolve: merge conflict in [file]"
   ```

4. **Validate Resolution**
   - Run full test suite
   - Manual testing if needed
   - Code review for complex conflicts

---

## Branch Protection Rules

### Main Branch Protection
```yaml
protection_rules:
  main:
    required_reviews: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    required_status_checks:
      - continuous-integration
      - security-scan
      - performance-test
    enforce_admins: false
    restrictions:
      users: ["bouric-okwaro"]
      teams: ["senior-developers"]
```

### Dev Branch Protection
```yaml
protection_rules:
  dev:
    required_reviews: 1
    dismiss_stale_reviews: true
    required_status_checks:
      - unit-tests
      - integration-tests
      - code-quality
    restrictions:
      users: ["bouric-okwaro", "caroline-obuya", "duncan-mathai"]
```

---

## Automated Workflows

### GitHub Actions / CI Pipeline

#### Feature Branch Workflow
```yaml
name: Feature Branch CI
on:
  pull_request:
    branches: [dev]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: |
          python manage.py test
      - name: Code quality check
        run: |
          flake8 .
          black --check .
          isort --check-only .
```

#### Release Workflow
```yaml
name: Release Pipeline
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          # Deployment script
          ./deploy.sh production
      - name: Run smoke tests
        run: |
          # Post-deployment validation
          ./smoke_tests.sh
```

---

## Emergency Procedures

### Hotfix Workflow

#### Critical Bug in Production
1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-fix
   ```

2. **Implement Fix**
   - Minimal changes only
   - Focus on the specific issue
   - Add tests for the fix

3. **Fast-Track Review**
   - Emergency review process
   - Team lead approval required
   - Security review if applicable

4. **Deploy Hotfix**
   ```bash
   # Merge to main
   git checkout main
   git merge --no-ff hotfix/critical-bug-fix
   git tag -a v1.0.1 -m "Hotfix: critical bug fix"
   git push origin main --tags
   
   # Merge back to dev
   git checkout dev
   git merge main
   git push origin dev
   ```

### Rollback Procedures

#### Production Rollback
```bash
# Identify last known good version
git log --oneline

# Create rollback branch
git checkout -b rollback/v1.0.0 v1.0.0

# Deploy previous version
./deploy.sh production rollback

# Update main branch
git checkout main
git reset --hard v1.0.0
git push --force-with-lease origin main
```

---

## Team Coordination

### Communication Protocols

#### Before Merging
- [ ] Notify team in Slack #dev channel
- [ ] Check for conflicting work
- [ ] Coordinate with dependent features
- [ ] Schedule integration window

#### During Conflicts
- [ ] Immediate notification to affected developers
- [ ] Schedule conflict resolution meeting
- [ ] Document resolution decisions
- [ ] Update team on resolution

#### After Merging
- [ ] Confirm successful integration
- [ ] Update project status
- [ ] Notify QA team if applicable
- [ ] Update documentation

### Integration Calendar

#### Weekly Schedule
- **Monday:** Feature branch creation
- **Tuesday-Wednesday:** Development and daily syncs
- **Thursday:** Feature completion and PR creation
- **Friday:** Code review and integration
- **Weekend:** Automated testing and validation

#### Monthly Schedule
- **Week 1-2:** Feature development
- **Week 3:** Integration and testing
- **Week 4:** Release preparation and deployment

---

## Monitoring & Metrics

### Integration Metrics

#### Branch Health Indicators
- **Merge frequency:** Target 2-3 merges per week per branch
- **Conflict rate:** <10% of merges should have conflicts
- **Review time:** Average <24 hours for PR review
- **Build success rate:** >95% successful builds

#### Quality Metrics
- **Test coverage:** Maintain >80% coverage
- **Code quality score:** Maintain A grade
- **Security vulnerabilities:** Zero critical vulnerabilities
- **Performance regression:** <5% performance degradation

### Monitoring Tools

#### Git Analytics
- Branch activity monitoring
- Merge conflict tracking
- Code review metrics
- Developer productivity metrics

#### Quality Gates
- Automated testing results
- Code coverage reports
- Security scan results
- Performance benchmark results

---

## Best Practices

### Do's
- ✅ Keep feature branches small and focused
- ✅ Rebase feature branches regularly
- ✅ Write descriptive commit messages
- ✅ Test thoroughly before creating PR
- ✅ Review code carefully and constructively
- ✅ Communicate changes that affect others
- ✅ Document complex merge resolutions

### Don'ts
- ❌ Don't merge without code review
- ❌ Don't force push to shared branches
- ❌ Don't merge broken code
- ❌ Don't ignore merge conflicts
- ❌ Don't bypass protection rules
- ❌ Don't merge without testing
- ❌ Don't leave stale branches

### Commit Message Format
```
type(scope): brief description

[optional body]

[optional footer]
```

#### Types
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes
- **refactor:** Code refactoring
- **test:** Test additions or modifications
- **chore:** Maintenance tasks

#### Examples
```
feat(auth): add JWT token refresh functionality

Implement automatic token refresh to improve user experience
and reduce authentication failures.

Closes #123
```

```
fix(internship): resolve application status update bug

Fixed issue where application status wasn't updating correctly
after employer review.

Fixes #456
```

---

## Troubleshooting Guide

### Common Issues

#### 1. **Merge Conflicts in Migrations**
```bash
# Solution: Create merge migration
python manage.py makemigrations --merge
python manage.py migrate
```

#### 2. **Outdated Feature Branch**
```bash
# Solution: Rebase on latest dev
git checkout feature/your-feature
git fetch origin
git rebase origin/dev
```

#### 3. **Failed CI/CD Pipeline**
```bash
# Solution: Check logs and fix issues
# Common fixes:
# - Update requirements.txt
# - Fix test failures
# - Resolve linting issues
```

#### 4. **Large Binary Files**
```bash
# Solution: Use Git LFS
git lfs track "*.pdf"
git lfs track "*.png"
git add .gitattributes
```

### Emergency Contacts

#### Merge Issues
- **Primary:** Bouric Enos Okwaro (Team Lead)
- **Secondary:** Caroline Obuya (Senior Backend Developer)

#### Security Conflicts
- **Primary:** Duncan Mathai (Security Engineer)
- **Secondary:** Bouric Enos Okwaro (Team Lead)

#### Database Conflicts
- **Primary:** Mark Matheka (Data Engineer)
- **Secondary:** Caroline Obuya (Backend Developer)

---

*Version: 1.0 - Beta Release*