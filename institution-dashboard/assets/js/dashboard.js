// Dashboard JavaScript - EduLink Institution Dashboard
let students = [];
let supervisors = [];
// Global variables
let currentSection = 'dashboard';
let logbooks = [];
let reports = [];
let internships = [];
// Data model: departments have supervisors and courses; courses have students
let departments = [];

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadSampleData();
    // loadDepartments(); // Only if needed
    // initializeCharts(); // REMOVE THIS LINE
    setupEventListeners();
    removeAdminAddStudent();
    setupSidebarToggle();
    updateDashboardStatsDynamic();
    loadDarkModePreference();
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.onclick = function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setDarkMode(!isDark);
        };
    }
    // Departments tab switching with localStorage and keyboard navigation
    const tabBtns = Array.from(document.querySelectorAll('.departments-tab-btn'));
    const tabPanels = document.querySelectorAll('.departments-tab-panel');
    // Restore last active tab from localStorage
    let lastTab = localStorage.getItem('departmentsActiveTab');
    let initialTab = tabBtns.find(btn => btn.getAttribute('data-tab') === lastTab) || tabBtns[0];
    if (initialTab) {
        tabBtns.forEach(b => b.classList.remove('active'));
        initialTab.classList.add('active');
        const tab = initialTab.getAttribute('data-tab');
        tabPanels.forEach(panel => {
            panel.style.display = (panel.getAttribute('data-tab-panel') === tab) ? 'block' : 'none';
        });
        if (tab === 'manage-departments') {
            renderManageDepartmentsDropdown();
        } else if (tab === 'assign-supervisors') {
            renderAssignSupervisorsDropdown();
        }
    }
    tabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tab = this.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                panel.style.display = (panel.getAttribute('data-tab-panel') === tab) ? 'block' : 'none';
            });
            localStorage.setItem('departmentsActiveTab', tab);
            if (tab === 'manage-departments') {
                renderManageDepartmentsDropdown();
            } else if (tab === 'assign-supervisors') {
                renderAssignSupervisorsDropdown();
            }
            this.focus();
        });
        // Keyboard navigation
        btn.addEventListener('keydown', function(e) {
            let handled = false;
            if (e.key === 'ArrowRight') {
                tabBtns[(idx + 1) % tabBtns.length].focus(); handled = true;
            } else if (e.key === 'ArrowLeft') {
                tabBtns[(idx - 1 + tabBtns.length) % tabBtns.length].focus(); handled = true;
            } else if (e.key === 'Home') {
                tabBtns[0].focus(); handled = true;
            } else if (e.key === 'End') {
                tabBtns[tabBtns.length - 1].focus(); handled = true;
            } else if (e.key === 'Enter' || e.key === ' ') {
                btn.click(); handled = true;
            }
            if (handled) e.preventDefault();
        });
    });
    // On page load, ensure the first tab is active
    const firstTab = document.querySelector('.departments-tab-btn');
    if (firstTab) firstTab.classList.add('active');

    // --- Add Department Tab: Dynamic Courses and Supervisors ---
    const coursesList = document.getElementById('addDeptCoursesList');
    const supervisorsList = document.getElementById('addDeptSupervisorsList');
    const addCourseBtn = document.getElementById('addDeptAddCourseBtn');
    const addSupervisorBtn = document.getElementById('addDeptAddSupervisorBtn');
    if (addCourseBtn && coursesList) {
        addCourseBtn.onclick = function() {
            const idx = coursesList.children.length;
            const div = document.createElement('div');
            div.className = 'course-input-row';
            div.innerHTML = `<input type="text" name="courseName${idx}" placeholder="Course Name" required style="margin-bottom:4px;"> <button type="button" class="btn btn-danger btn-sm" onclick="this.parentNode.remove()" style="margin-left:6px;">Remove</button>`;
            coursesList.appendChild(div);
        };
    }
    if (addSupervisorBtn && supervisorsList) {
        addSupervisorBtn.onclick = function() {
            const idx = supervisorsList.children.length;
            const div = document.createElement('div');
            div.className = 'supervisor-input-row';
            div.innerHTML = `
                <input type="text" name="supervisorName${idx}" placeholder="Name" required style="margin-bottom:4px;">
                <input type="email" name="supervisorEmail${idx}" placeholder="Email" required style="margin-bottom:4px;">
                <input type="text" name="supervisorPassword${idx}" placeholder="Password" required style="margin-bottom:4px;">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentNode.remove()" style="margin-left:6px;">Remove</button>
            `;
            supervisorsList.appendChild(div);
        };
    }
    // Add Department form submit
    const addDeptForm = document.getElementById('addDepartmentTabForm');
    if (addDeptForm) {
        addDeptForm.onsubmit = function(e) {
            e.preventDefault();
            const form = e.target;
            const name = form.departmentName.value.trim();
            // Gather courses
            const courses = [];
            Array.from(form.querySelectorAll('#addDeptCoursesList input[name^="courseName"]')).forEach(input => {
                if (input.value.trim()) courses.push({ id: Date.now() + Math.random(), name: input.value.trim(), students: [] });
            });
            // Gather supervisors
            const supervisors = [];
            Array.from(form.querySelectorAll('#addDeptSupervisorsList .supervisor-input-row')).forEach(row => {
                const n = row.querySelector('input[name^="supervisorName"]').value.trim();
                const e = row.querySelector('input[name^="supervisorEmail"]').value.trim();
                const p = row.querySelector('input[name^="supervisorPassword"]').value.trim();
                if (n && e && p) supervisors.push({ id: Date.now() + Math.random(), name: n, email: e, password: p });
            });
            departments.push({ id: Date.now(), name, courses, supervisors });
            showNotification('Department added!', 'success');
            form.reset();
            coursesList.innerHTML = '';
            supervisorsList.innerHTML = '';
            // Refresh dropdowns in other tabs
            if (typeof renderManageDepartmentsDropdown === 'function') renderManageDepartmentsDropdown();
            if (typeof renderAssignSupervisorsDropdown === 'function') renderAssignSupervisorsDropdown();
        };
    }

    // Settings tab switching (vertical)
    const settingsTabBtnsV = Array.from(document.querySelectorAll('.settings-tab-btn-vertical'));
    const settingsTabPanelsV = document.querySelectorAll('.settings-tab-panel-vertical');
    if (settingsTabBtnsV.length) {
        let lastTab = localStorage.getItem('settingsActiveTab');
        let initialTab = settingsTabBtnsV.find(btn => btn.getAttribute('data-tab') === lastTab) || settingsTabBtnsV[0];
        if (initialTab) {
            settingsTabBtnsV.forEach(b => b.classList.remove('active'));
            initialTab.classList.add('active');
            const tab = initialTab.getAttribute('data-tab');
            settingsTabPanelsV.forEach(panel => {
                panel.style.display = (panel.getAttribute('data-tab-panel') === tab) ? 'block' : 'none';
            });
        }
        settingsTabBtnsV.forEach((btn, idx) => {
            btn.addEventListener('click', function() {
                settingsTabBtnsV.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const tab = this.getAttribute('data-tab');
                settingsTabPanelsV.forEach(panel => {
                    panel.style.display = (panel.getAttribute('data-tab-panel') === tab) ? 'block' : 'none';
                });
                localStorage.setItem('settingsActiveTab', tab);
                this.focus();
            });
            btn.addEventListener('keydown', function(e) {
                let handled = false;
                if (e.key === 'ArrowDown') {
                    settingsTabBtnsV[(idx + 1) % settingsTabBtnsV.length].focus(); handled = true;
                } else if (e.key === 'ArrowUp') {
                    settingsTabBtnsV[(idx - 1 + settingsTabBtnsV.length) % settingsTabBtnsV.length].focus(); handled = true;
                } else if (e.key === 'Home') {
                    settingsTabBtnsV[0].focus(); handled = true;
                } else if (e.key === 'End') {
                    settingsTabBtnsV[settingsTabBtnsV.length - 1].focus(); handled = true;
                } else if (e.key === 'Enter' || e.key === ' ') {
                    btn.click(); handled = true;
                }
                if (handled) e.preventDefault();
            });
        });
        if (!settingsTabBtnsV.some(btn => btn.classList.contains('active'))) {
            settingsTabBtnsV[0].classList.add('active');
            settingsTabPanelsV.forEach((panel, i) => {
                panel.style.display = i === 0 ? 'block' : 'none';
            });
        }
    }

    // On page load, navigate to last visited section if present
    const lastSection = localStorage.getItem('lastVisitedSection');
    if (lastSection && document.getElementById(lastSection)) {
        navigateToSection(lastSection);
    } else {
        navigateToSection('dashboard');
    }
});

// Initialize dashboard
function initializeDashboard() {
    console.log('EduLink Institution Dashboard initialized');
    // updateDashboardStats(); // No longer needed with new data model
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            navigateToSection(section);
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Form submissions (defensive)
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) addStudentForm.addEventListener('submit', handleAddStudent);
    const addSupervisorForm = document.getElementById('addSupervisorForm');
    if (addSupervisorForm) addSupervisorForm.addEventListener('submit', handleAddSupervisor);
    const institutionForm = document.getElementById('institutionForm');
    if (institutionForm) institutionForm.addEventListener('submit', handleInstitutionUpdate);
    const addDepartmentForm = document.getElementById('addDepartmentForm');
    if (addDepartmentForm) addDepartmentForm.addEventListener('submit', handleAddDepartment);
    const editDepartmentForm = document.getElementById('editDepartmentForm');
    if (editDepartmentForm) editDepartmentForm.addEventListener('submit', handleEditDepartment);
    const addCourseForm = document.getElementById('addCourseForm');
    if (addCourseForm) addCourseForm.addEventListener('submit', handleAddCourse);
    const internshipForm = document.getElementById('internshipForm');
    if (internshipForm) {
        internshipForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleInternshipFormSubmit(e);
        });
    }
    const saveBtn = document.getElementById('saveInternshipBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            const form = document.getElementById('internshipForm');
            if (form) {
                // Manually trigger the submit event
                const event = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(event);
            }
        });
    }

    // Filters (defensive)
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) departmentFilter.addEventListener('change', filterStudents);
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', filterStudents);
    const searchStudent = document.getElementById('searchStudent');
    if (searchStudent) searchStudent.addEventListener('input', filterStudents);
}

// Navigation function
function navigateToSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sectionEl => {
        sectionEl.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    document.getElementById(section).classList.add('active');

    // Add active class to nav item
    document.querySelector(`[data-section="${section}"]`).parentElement.classList.add('active');

    currentSection = section;
    // Persist current section
    localStorage.setItem('lastVisitedSection', section);

    // Load section-specific data
    switch(section) {
        case 'students':
            loadStudents();
            break;
        case 'supervisors':
            loadSupervisors();
            break;
        case 'logbooks':
            loadLogbooks();
            break;
        case 'reports':
            loadReports();
            break;
        case 'internships':
            loadInternships();
            break;
        case 'certificates':
            loadCertificates();
            break;
        case 'departments':
            loadDepartments();
            break;
    }
}

// Load sample data
function loadSampleData() {
    departments = [
        {
            id: 1, name: 'Computing',
            supervisors: [
                { id: 1, name: 'Dr. Kimani', email: 'kimani@institution.edu', password: 'pass123' },
                { id: 2, name: 'Prof. Ochieng', email: 'ochieng@institution.edu', password: 'pass456' },
                { id: 4, name: 'Ms. Amina', email: 'amina@institution.edu', password: 'pass789' } // Added supervisor
            ],
            courses: [
                { id: 1, name: 'IT', students: [
                    { id: 1, name: 'Lucy Wanjiru', email: 'lucy.wanjiru@student.edu' },
                    { id: 2, name: 'David Omondi', email: 'david.omondi@student.edu' }
                ]},
                { id: 2, name: 'CS', students: [
                    { id: 3, name: 'Sarah Muthoni', email: 'sarah.muthoni@student.edu' }
                ]},
                { id: 3, name: 'CT', students: [] }
            ]
        },
        {
            id: 2, name: 'Engineering',
            supervisors: [
                { id: 3, name: 'Dr. Wambui', email: 'wambui@institution.edu', password: 'pass789' }
            ],
            courses: [
                { id: 4, name: 'Civil', students: [
                    { id: 4, name: 'Grace Akinyi', email: 'grace.akinyi@student.edu' }
                ]}
            ]
        }
    ];
}

// Update dashboard statistics
// function updateDashboardStats() {
//     // Old summary card logic removed
// }

// Load students
function loadStudents() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.supervisor}</td>
            <td><span class="status-badge status-${student.status}">${student.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewStudent(${student.id})">View</button>
                    <button class="action-btn edit" onclick="editStudent(${student.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteStudent(${student.id})">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load supervisors
function loadSupervisors() {
    const grid = document.getElementById('supervisorsGrid');
    grid.innerHTML = '';

    supervisors.forEach(supervisor => {
        const card = document.createElement('div');
        card.className = 'supervisor-card';
        card.innerHTML = `
            <div class="supervisor-header">
                <div class="supervisor-avatar">
                    ${supervisor.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div class="supervisor-info">
                    <h3>${supervisor.name}</h3>
                    <p>${supervisor.role}</p>
                </div>
            </div>
            <div class="supervisor-stats">
                <div class="stat-item">
                    <span class="stat-value">${supervisor.students}</span>
                    <span class="stat-label">Students</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${supervisor.completed}</span>
                    <span class="stat-label">Completed</span>
                </div>
            </div>
            <div class="supervisor-actions">
                <button class="btn btn-primary" onclick="viewSupervisor(${supervisor.id})">View Details</button>
                <button class="btn btn-secondary" onclick="editSupervisor(${supervisor.id})">Edit</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Load logbooks
function loadLogbooks() {
    const container = document.getElementById('logbooksContainer');
    container.innerHTML = '<div class="section-header"><h3>Pending Reviews</h3></div>';

    const pendingLogbooks = logbooks.filter(l => l.status === 'pending');
    
    if (pendingLogbooks.length === 0) {
        container.innerHTML += '<p>No pending logbooks to review.</p>';
        return;
    }

    pendingLogbooks.forEach(logbook => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-content">
                <h3>${logbook.student} - Week ${logbook.week}</h3>
                <p>Submitted: ${logbook.date}</p>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="reviewLogbook(${logbook.id})">Review</button>
                    <button class="btn btn-secondary" onclick="downloadLogbook(${logbook.id})">Download</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Load reports
function loadReports() {
    const container = document.getElementById('reportsContainer');
    container.innerHTML = '<div class="section-header"><h3>Final Reports</h3></div>';

    reports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-content">
                <h3>${report.title}</h3>
                <p><strong>Student:</strong> ${report.student}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${report.status}">${report.status}</span></p>
                <p><strong>Submitted:</strong> ${report.date}</p>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="reviewReport(${report.id})">Review</button>
                    <button class="btn btn-secondary" onclick="downloadReport(${report.id})">Download</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Load internships
function loadInternships() {
    const container = document.getElementById('internshipsContainer');
    if (!container) return;
    container.innerHTML = '<div class="section-header"><h3>Active Internships</h3></div>';

    const activeInternships = internships.filter(i => i.status === 'active');
    
    activeInternships.forEach(internship => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-content">
                <h3>${internship.position}</h3>
                <p><strong>Company:</strong> ${internship.company}</p>
                <p><strong>Students:</strong> ${internship.students}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${internship.status}">${internship.status}</span></p>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="viewInternship(${internship.id})">View Details</button>
                    <button class="btn btn-secondary" onclick="editInternship(${internship.id})">Edit</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Load certificates
function loadCertificates() {
    const container = document.getElementById('certificatesContainer');
    container.innerHTML = '<div class="section-header"><h3>Issued Certificates</h3></div>';

    const approvedReports = reports.filter(r => r.status === 'approved');
    
    if (approvedReports.length === 0) {
        container.innerHTML += '<p>No certificates issued yet.</p>';
        return;
    }

    approvedReports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-content">
                <h3>Certificate for ${report.student}</h3>
                <p><strong>Report:</strong> ${report.title}</p>
                <p><strong>Issued:</strong> ${report.date}</p>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="downloadCertificate(${report.id})">Download</button>
                    <button class="btn btn-secondary" onclick="viewCertificate(${report.id})">View</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Load departments
function loadDepartments() {
    // Only run if departmentSelect and departmentDetails exist
    const select = document.getElementById('departmentSelect');
    const details = document.getElementById('departmentDetails');
    if (!select || !details) return;
    select.innerHTML = '<option value="">-- Select Department --</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    select.onchange = function() {
        renderDepartmentDetails(this.value);
    };
    // Render first department if any
    if (departments.length > 0) {
        select.value = select.value || departments[0].id;
        renderDepartmentDetails(select.value);
    } else {
        details.innerHTML = '<p>No departments found. Add a new department.</p>';
    }
}

function renderDepartmentDetails(deptId) {
    const details = document.getElementById('departmentDetails');
    if (!details) return;
    const dept = departments.find(d => d.id == deptId);
    if (!dept) {
        details.innerHTML = '<p>Select a department to view details.</p>';
        return;
    }
    details.innerHTML = `
        <div class="department-block">
            <div class="department-header">
                <h3>${dept.name}</h3>
            </div>
            <div class="supervisors-list">
                <strong>Supervisors:</strong>
                <ul>
                    ${dept.supervisors.map(sup => `<li>${sup.name} (${sup.email})</li>`).join('') || '<li>No supervisors</li>'}
                </ul>
            </div>
            <div class="courses-list">
                <strong>Courses:</strong>
                <ul>
                    ${dept.courses.map(course => `
                        <li>
                            <div class="course-header">${course.name}</div>
                            <div class="students-list">
                                <em>Students:</em>
                                <ul>
                                    ${course.students.length ? course.students.map(stu => `<li>${stu.name} (${stu.email}) <span style='font-size:0.95em;color:#888;'>Supervisor: <b>${stu.supervisor || 'Unassigned'}</b></span></li>`).join('') : '<li>No students</li>'}
                                </ul>
                            </div>
                        </li>
                    `).join('') || '<li>No courses</li>'}
                </ul>
            </div>
        </div>
    `;
}

// Add Department Modal: dynamic course and supervisor inputs
function addCourseInput() {
    const list = document.getElementById('coursesList');
    const idx = list.children.length;
    const div = document.createElement('div');
    div.className = 'course-input-row';
    div.innerHTML = `<input type="text" name="courseName${idx}" placeholder="Course Name" required> <button type="button" onclick="this.parentNode.remove()">Remove</button>`;
    list.appendChild(div);
}
function addSupervisorInput() {
    const list = document.getElementById('supervisorsList');
    const idx = list.children.length;
    const div = document.createElement('div');
    div.className = 'supervisor-input-row';
    div.innerHTML = `
        <input type="text" name="supervisorName${idx}" placeholder="Name" required>
        <input type="email" name="supervisorEmail${idx}" placeholder="Email" required>
        <input type="text" name="supervisorPassword${idx}" placeholder="Password" required>
        <button type="button" onclick="this.parentNode.remove()">Remove</button>
    `;
    list.appendChild(div);
}
window.addCourseInput = addCourseInput;
window.addSupervisorInput = addSupervisorInput;

// Handle Add Department form
function handleAddDepartment(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.departmentName.value.trim();
    // Gather courses
    const courses = [];
    const coursesList = form.querySelector('#addDeptCoursesList');
    const supervisorsList = form.querySelector('#addDeptSupervisorsList');
    Array.from(form.querySelectorAll('#addDeptCoursesList input[name^="courseName"]')).forEach(input => {
        if (input.value.trim()) courses.push({ id: Date.now() + Math.random(), name: input.value.trim(), students: [] });
    });
    // Gather supervisors
    const supervisors = [];
    Array.from(form.querySelectorAll('#addDeptSupervisorsList .supervisor-input-row')).forEach(row => {
        const n = row.querySelector('input[name^="supervisorName"]').value.trim();
        const e = row.querySelector('input[name^="supervisorEmail"]').value.trim();
        const p = row.querySelector('input[name^="supervisorPassword"]').value.trim();
        if (n && e && p) supervisors.push({ id: Date.now() + Math.random(), name: n, email: e, password: p });
    });
    departments.push({ id: Date.now(), name, courses, supervisors });
    showNotification('Department added!', 'success');
    form.reset();
    if (coursesList) coursesList.innerHTML = '';
    if (supervisorsList) supervisorsList.innerHTML = '';
    // Refresh dropdowns in other tabs
    if (typeof renderManageDepartmentsDropdown === 'function') renderManageDepartmentsDropdown();
    if (typeof renderAssignSupervisorsDropdown === 'function') renderAssignSupervisorsDropdown();
    // Do NOT close the modal
}
document.getElementById('addDepartmentForm').addEventListener('submit', handleAddDepartment);

// Filter students
function filterStudents() {
    const departmentFilter = document.getElementById('departmentFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchFilter = document.getElementById('searchStudent').value.toLowerCase();

    const filteredStudents = students.filter(student => {
        const matchesDepartment = !departmentFilter || student.department === departmentFilter;
        const matchesStatus = !statusFilter || student.status === statusFilter;
        const matchesSearch = !searchFilter || student.name.toLowerCase().includes(searchFilter);

        return matchesDepartment && matchesStatus && matchesSearch;
    });

    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    filteredStudents.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.supervisor}</td>
            <td><span class="status-badge status-${student.status}">${student.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewStudent(${student.id})">View</button>
                    <button class="action-btn edit" onclick="editStudent(${student.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteStudent(${student.id})">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Modal functions
function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'block';
}

function showAddSupervisorModal(deptId) {
    const modal = document.getElementById('addSupervisorModal');
    modal.querySelector('form').reset();
    modal.querySelector('input[name="supervisorDepartmentId"]').value = deptId;
    modal.style.display = 'block';
}

function showAddInternshipModal() {
    alert('Add Internship functionality would be implemented here');
}

function showAddDepartmentModal() {
    document.getElementById('addDepartmentModal').style.display = 'block';
}

function showAddCourseModal(deptId) {
    const modal = document.getElementById('addCourseModal');
    modal.querySelector('form').reset();
    modal.querySelector('input[name="courseDepartmentId"]').value = deptId;
    modal.style.display = 'block';
}

function showEditDepartmentModal(id) {
    const dept = departments.find(d => d.id === id);
    if (!dept) return;
    const form = document.getElementById('editDepartmentForm');
    form.editDepartmentName.value = dept.name;
    form.editDepartmentId.value = dept.id;
    document.getElementById('editDepartmentModal').style.display = 'block';
}

// Form handlers
function handleAddStudent(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const newStudent = {
        id: students.length + 1,
        name: formData.get('fullName'),
        department: formData.get('department'),
        supervisor: 'Unassigned',
        status: 'pending',
        email: formData.get('email')
    };

    students.push(newStudent);
    document.getElementById('addStudentModal').style.display = 'none';
    e.target.reset();
    
    if (currentSection === 'students') {
        loadStudents();
    }
    // updateDashboardStats(); // No longer needed with new data model
    
    showNotification('Student added successfully!', 'success');
}

function handleAddSupervisor(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const deptId = parseInt(formData.get('supervisorDepartmentId'));
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    const newSupervisor = {
        id: Date.now(),
        name: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    dept.supervisors.push(newSupervisor);
    // document.getElementById('addSupervisorModal').style.display = 'none'; // Do NOT close
    loadDepartments();
    showNotification('Supervisor added!', 'success');
}

function handleAddCourse(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const deptId = parseInt(formData.get('courseDepartmentId'));
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    const newCourse = {
        id: Date.now(),
        name: formData.get('courseName'),
        students: []
    };
    dept.courses.push(newCourse);
    // document.getElementById('addCourseModal').style.display = 'none'; // Do NOT close
    loadDepartments();
    showNotification('Course added!', 'success');
}

function handleInstitutionUpdate(e) {
    e.preventDefault();
    showNotification('Institution information updated successfully!', 'success');
}

function handleEditDepartment(e) {
    e.preventDefault();
    const id = parseInt(e.target.editDepartmentId.value);
    const name = e.target.editDepartmentName.value.trim();
    const dept = departments.find(d => d.id === id);
    if (dept && name) {
        dept.name = name;
        // document.getElementById('editDepartmentModal').style.display = 'none'; // Do NOT close
        loadDepartments();
        updateSupervisorDepartmentDropdown();
        updateStudentDepartmentDropdown();
        showNotification('Department updated!', 'success');
    }
}

// Action functions
function viewStudent(id) {
    const student = students.find(s => s.id === id);
    alert(`Viewing student: ${student.name}\nDepartment: ${student.department}\nEmail: ${student.email}`);
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    alert(`Editing student: ${student.name}`);
}

function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.id !== id);
        if (currentSection === 'students') {
            loadStudents();
        }
        // updateDashboardStats(); // No longer needed with new data model
        showNotification('Student deleted successfully!', 'success');
    }
}

function viewSupervisor(id) {
    const supervisor = supervisors.find(s => s.id === id);
    alert(`Viewing supervisor: ${supervisor.name}\nDepartment: ${supervisor.department}\nStudents: ${supervisor.students}`);
}

function editSupervisor(id) {
    const supervisor = supervisors.find(s => s.id === id);
    alert(`Editing supervisor: ${supervisor.name}`);
}

function reviewLogbook(id) {
    const logbook = logbooks.find(l => l.id === id);
    alert(`Reviewing logbook for: ${logbook.student} - Week ${logbook.week}`);
}

function downloadLogbook(id) {
    const logbook = logbooks.find(l => l.id === id);
    alert(`Downloading logbook for: ${logbook.student} - Week ${logbook.week}`);
}

function reviewReport(id) {
    const report = reports.find(r => r.id === id);
    alert(`Reviewing report: ${report.title} by ${report.student}`);
}

function downloadReport(id) {
    const report = reports.find(r => r.id === id);
    alert(`Downloading report: ${report.title} by ${report.student}`);
}

function viewInternship(id) {
    const internship = internships.find(i => i.id === id);
    alert(`Viewing internship: ${internship.position} at ${internship.company}`);
}

function editInternship(id) {
    const internship = internships.find(i => i.id === id);
    alert(`Editing internship: ${internship.position} at ${internship.company}`);
}

function downloadCertificate(id) {
    const report = reports.find(r => r.id === id);
    alert(`Downloading certificate for: ${report.student}`);
}

function viewCertificate(id) {
    const report = reports.find(r => r.id === id);
    alert(`Viewing certificate for: ${report.student}`);
}

function generateCertificates() {
    const pendingReports = reports.filter(r => r.status === 'submitted');
    if (pendingReports.length === 0) {
        alert('No pending reports to generate certificates for.');
        return;
    }
    
    alert(`Generating certificates for ${pendingReports.length} completed reports.`);
    showNotification('Certificates generated successfully!', 'success');
}

// Department CRUD
function editDepartment(id) {
    showEditDepartmentModal(id);
}

function deleteDepartment(id) {
    if (confirm('Delete this department?')) {
        departments = departments.filter(d => d.id !== id);
        loadDepartments();
        updateSupervisorDepartmentDropdown();
        updateStudentDepartmentDropdown();
        showNotification('Department deleted.', 'success');
    }
}

// Update supervisor form department dropdown
const addSupervisorForm = document.getElementById('addSupervisorForm');
if (addSupervisorForm && addSupervisorForm.department) {
    addSupervisorForm.department.innerHTML = '';
}
function updateSupervisorDepartmentDropdown() {
    const select = document.getElementById('addSupervisorForm')?.department;
    if (select) {
        select.innerHTML = '<option value="">Select Department</option>' +
            departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    }
}

// Update student registration department dropdown (if present)
function updateStudentDepartmentDropdown() {
    const select = document.getElementById('studentDepartmentDropdown');
    if (select) {
        select.innerHTML = '<option value="">Select Department</option>' +
            departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    }
}

// --- Assign Supervisor to Student Logic ---
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-assign-supervisor')) {
        const studentId = parseInt(e.target.getAttribute('data-student-id'));
        const deptId = parseInt(e.target.getAttribute('data-dept-id'));
        const courseId = parseInt(e.target.getAttribute('data-course-id'));
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return;
        const course = dept.courses.find(c => c.id === courseId);
        if (!course) return;
        const student = course.students.find(s => s.id === studentId);
        if (!student) return;
        // Find the corresponding dropdown
        const dropdown = document.querySelector(`select.assign-supervisor-dropdown[data-student-id='${studentId}'][data-dept-id='${deptId}'][data-course-id='${courseId}']`);
        if (!dropdown) return;
        const supervisorName = dropdown.value;
        student.supervisor = supervisorName;
        // Set status based on supervisor assignment
        student.status = supervisorName ? 'active' : 'pending';
        // Also update in global students array if present
        const globalStudent = students.find(s => s.id === student.id);
        if (globalStudent) {
            globalStudent.supervisor = supervisorName;
            globalStudent.status = supervisorName ? 'active' : 'pending';
        }
        showNotification('Supervisor assigned!', 'success');
        // Re-render department details to reflect the change
        renderDepartmentDetails(deptId);
        // Re-render manage departments details if open
        if (typeof renderManageDepartmentsDetails === 'function') renderManageDepartmentsDetails(deptId);
        // Re-render students table if on students section
        if (currentSection === 'students') loadStudents();
    }
});

// --- Bulk Assign Supervisors Logic ---
document.addEventListener('submit', function(e) {
    if (e.target.classList.contains('bulk-assign-supervisors-form')) {
        e.preventDefault();
        const deptId = parseInt(e.target.getAttribute('data-dept-id'));
        const dept = departments.find(d => d.id === deptId);
        if (!dept) return;
        // For each student, update supervisor if changed
        // Defensive: Check if dept.courses is an array and has elements
        if (dept.courses && dept.courses.length > 0) {
            dept.courses.forEach(course => {
                if (course.students) {
                    course.students.forEach(stu => {
                        const dropdown = e.target.querySelector(`select.assign-supervisor-dropdown[data-student-id='${stu.id}']`);
                        if (dropdown) {
                            const supervisorName = dropdown.value;
                            stu.supervisor = supervisorName;
                            // Set status based on supervisor assignment
                            stu.status = supervisorName ? 'active' : 'pending';
                            // Also update in global students array if present
                            const globalStudent = students.find(s => s.id === stu.id);
                            if (globalStudent) {
                                globalStudent.supervisor = supervisorName;
                                globalStudent.status = supervisorName ? 'active' : 'pending';
                            }
                        }
                    });
                }
            });
            showNotification('Supervisor assignments saved!', 'success');
            renderDepartmentDetails(deptId);
            if (typeof renderManageDepartmentsDetails === 'function') renderManageDepartmentsDetails(deptId);
            if (currentSection === 'students') loadStudents();
        }
    }
});

// Remove Add Student from admin dashboard
// Hide Add Student button and related modal
function removeAdminAddStudent() {
    const btn = document.querySelector('.section-header button[onclick="showAddStudentModal()"]');
    if (btn) btn.style.display = 'none';
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.style.display = 'none';
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// --- Dynamic Dashboard Stats & Live Counters ---
function animateCounter(element, endValue, duration = 1200) {
    if (!element) return;
    let start = 0;
    const increment = endValue / (duration / 16);
    function update() {
        start += increment;
        if (start < endValue) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(update);
        } else {
            element.textContent = endValue;
        }
    }
    update();
}

function updateDashboardStatsDynamic() {
    // Calculate stats from data model
    const totalDepartments = departments.length;
    const totalSupervisors = departments.reduce((sum, d) => sum + (d.supervisors ? d.supervisors.length : 0), 0);
    const totalCourses = departments.reduce((sum, d) => sum + (d.courses ? d.courses.length : 0), 0);
    const allStudents = departments.flatMap(d => d.courses ? d.courses.flatMap(c => c.students || []) : []);
    const totalStudents = allStudents.length;
    const verifiedStudents = 120; // Placeholder, replace with real logic if available
    const activeInternships = 12; // Placeholder, replace with real logic if available
    const pendingLogbooks = 5; // Placeholder, replace with real logic if available
    const certificatesIssued = 30; // Placeholder, replace with real logic if available
    const avgCompletion = 10; // Placeholder, replace with real logic if available

    // Gender ratio (assume student objects have gender property)
    const femaleCount = allStudents.filter(s => s.gender === 'female').length;
    const maleCount = allStudents.filter(s => s.gender === 'male').length;
    const genderRatio = totalStudents > 0 ? `${Math.round((femaleCount/totalStudents)*100)}% Female / ${Math.round((maleCount/totalStudents)*100)}% Male` : 'N/A';

    // Most popular course
    let courseCounts = {};
    departments.forEach(d => d.courses && d.courses.forEach(c => {
        courseCounts[c.name] = (courseCounts[c.name] || 0) + (c.students ? c.students.length : 0);
    }));
    let mostPopularCourse = Object.entries(courseCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

    // Top supervisor (by number of students assigned)
    let supervisorCounts = {};
    departments.forEach(d => d.supervisors && d.supervisors.forEach(sup => {
        supervisorCounts[sup.name] = 0;
    }));
    departments.forEach(d => d.courses && d.courses.forEach(c => c.students && c.students.forEach(stu => {
        if (stu.supervisor) supervisorCounts[stu.supervisor] = (supervisorCounts[stu.supervisor]||0)+1;
    })));
    let topSupervisor = Object.entries(supervisorCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

    // Animate summary cards
    animateCounter(document.getElementById('dashboardTotalDepartments'), totalDepartments);
    animateCounter(document.getElementById('dashboardTotalSupervisors'), totalSupervisors);
    animateCounter(document.getElementById('dashboardTotalCourses'), totalCourses);
    // If you want to animate other cards, add their IDs and logic here

    // Update quick stats
    const genderRatioEl = document.querySelector('.quick-stat-card .quick-stat-value');
    if (genderRatioEl) genderRatioEl.textContent = genderRatio;
    const mostPopularCourseEl = document.querySelectorAll('.quick-stat-card .quick-stat-value')[1];
    if (mostPopularCourseEl) mostPopularCourseEl.textContent = mostPopularCourse;
    const topSupervisorEl = document.querySelectorAll('.quick-stat-card .quick-stat-value')[2];
    if (topSupervisorEl) topSupervisorEl.textContent = topSupervisor;

    // Update internships posted card
    const internshipsPostedEl = document.getElementById('dashboardInternshipsPosted');
    if (internshipsPostedEl) {
        const internships = getInternships();
        internshipsPostedEl.textContent = internships.length;
    }
}

// --- Dark Mode Toggle ---
function setDarkMode(enabled) {
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : '');
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) icon.className = enabled ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('darkMode', enabled ? '1' : '0');
}
function loadDarkModePreference() {
    const dark = localStorage.getItem('darkMode') === '1';
    setDarkMode(dark);
}

// Export functions for global access
window.showAddStudentModal = showAddStudentModal;
window.showAddSupervisorModal = showAddSupervisorModal;
window.showAddInternshipModal = showAddInternshipModal;
window.generateCertificates = generateCertificates;
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.viewSupervisor = viewSupervisor;
window.editSupervisor = editSupervisor;
window.reviewLogbook = reviewLogbook;
window.downloadLogbook = downloadLogbook;
window.reviewReport = reviewReport;
window.downloadReport = downloadReport;
window.viewInternship = viewInternship;
window.editInternship = editInternship;
window.downloadCertificate = downloadCertificate;
window.viewCertificate = viewCertificate; 
window.showAddDepartmentModal = showAddDepartmentModal;
window.showEditDepartmentModal = showEditDepartmentModal;
window.handleAddDepartment = handleAddDepartment;
window.handleEditDepartment = handleEditDepartment;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
window.updateSupervisorDepartmentDropdown = updateSupervisorDepartmentDropdown;
window.updateStudentDepartmentDropdown = updateStudentDepartmentDropdown;
window.removeAdminAddStudent = removeAdminAddStudent; 

function setupSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const hamburger = document.getElementById('sidebarToggle');
    if (!sidebar || !hamburger) return;
    // Defensive: Remove any pointer-events:none from sidebar
    sidebar.style.pointerEvents = 'auto';
    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
    });
    // Close sidebar when clicking outside (on mobile)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 900 && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        }
    });
    // Always re-add nav-link click listeners
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = function(e) {
            // Always allow navigation
            if (window.innerWidth <= 900) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        };
    });
} 

function renderDepartmentsAssignSupervisors() {
    const container = document.getElementById('departmentsAssignSupervisorsContainer');
    if (!container) return;
    let html = '';
    departments.forEach(dept => {
        html += `<div style='margin-bottom:32px;'>
            <h3 style='color:#1abc60;font-size:1.1rem;margin-bottom:8px;'>${dept.name}</h3>
            <div class='courses-list'>
                <ul style='margin:0;padding:0;'>
                    ${dept.courses.map(course => `
                        <li style='margin-bottom:18px;'>
                            <div class='course-header' style='font-weight:600;color:#2196F3;'>${course.name}</div>
                            <form class='bulk-assign-supervisors-form' data-dept-id='${dept.id}' data-course-id='${course.id}'>
                            <table class='data-table' style='margin-bottom: 12px;'>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Current Supervisor</th>
                                        <th>Assign Supervisor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${course.students.length ? course.students.map(stu => `
                                        <tr>
                                            <td>${stu.name}</td>
                                            <td>${stu.email}</td>
                                            <td>${stu.supervisor || 'Unassigned'}</td>
                                            <td>
                                                <select name='supervisor_${stu.id}' class='assign-supervisor-dropdown' data-student-id='${stu.id}'>
                                                    <option value=''>Select Supervisor</option>
                                                    ${dept.supervisors.map(sup => `<option value='${sup.name}' ${stu.supervisor===sup.name?'selected':''}>${sup.name}</option>`).join('')}
                                                </select>
                                            </td>
                                        </tr>
                                    `).join('') : `<tr><td colspan='4'>No students</td></tr>`}
                                </tbody>
                            </table>
                            <button type='submit' class='btn btn-primary btn-save-bulk-assign' style='font-size:0.98em;'>Save All Assignments</button>
                            </form>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>`;
    });
    container.innerHTML = html;
} 

function renderManageDepartmentsDropdown() {
    const select = document.getElementById('manageDepartmentsSelect');
    const details = document.getElementById('manageDepartmentsDetails');
    if (!select || !details) return;
    select.innerHTML = '<option value="">-- Select Department --</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    select.onchange = function() {
        renderManageDepartmentsDetails(this.value);
    };
    details.innerHTML = '';
}

function renderManageDepartmentsDetails(deptId) {
    const details = document.getElementById('manageDepartmentsDetails');
    if (!details) return;
    const dept = departments.find(d => d.id == deptId);
    if (!dept) {
        details.innerHTML = '<p>Select a department to view details.</p>';
        return;
    }
    details.innerHTML = `
        <div class="department-block">
            <div class="department-header">
                <h3>${dept.name}</h3>
            </div>
            <div class="supervisors-list">
                <strong>Supervisors:</strong>
                <ul>
                    ${dept.supervisors.map(sup => `<li>${sup.name} (${sup.email})</li>`).join('') || '<li>No supervisors</li>'}
                </ul>
            </div>
            <div class="courses-list">
                <strong>Courses:</strong>
                <ul>
                    ${dept.courses.map(course => `
                        <li>
                            <div class="course-header">${course.name}</div>
                            <div class="students-list">
                                <em>Students:</em>
                                <ul>
                                    ${course.students.length ? course.students.map(stu => `<li>${stu.name} (${stu.email}) <span style='font-size:0.95em;color:#888;'>Supervisor: <b>${stu.supervisor || 'Unassigned'}</b></span></li>`).join('') : '<li>No students</li>'}
                                </ul>
                            </div>
                        </li>
                    `).join('') || '<li>No courses</li>'}
                </ul>
            </div>
        </div>
    `;
}

function renderAssignSupervisorsDropdown() {
    const select = document.getElementById('assignSupervisorsDeptSelect');
    const container = document.getElementById('departmentsAssignSupervisorsContainer');
    if (!select || !container) return;
    select.innerHTML = '<option value="">-- Select Department --</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    select.onchange = function() {
        renderAssignSupervisorsTable(this.value);
    };
    container.innerHTML = '';
}

function renderAssignSupervisorsTable(deptId) {
    const container = document.getElementById('departmentsAssignSupervisorsContainer');
    if (!container) return;
    const dept = departments.find(d => d.id == deptId);
    if (!dept) {
        container.innerHTML = '<p>Select a department to assign supervisors.</p>';
        return;
    }
    // Gather all students in this department (across all courses)
    let allStudents = [];
    dept.courses.forEach(course => {
        course.students.forEach(stu => {
            allStudents.push({ ...stu, courseName: course.name });
        });
    });
    if (allStudents.length === 0) {
        container.innerHTML = '<p>No students in this department.</p>';
        return;
    }
    // List supervisors first, only show unassigned or assigned-to-this-supervisor students
    let html = '';
    dept.supervisors.forEach((sup, idx) => {
        // Filter students: only unassigned or assigned to this supervisor
        const filteredStudents = allStudents.filter(stu => !stu.supervisor || stu.supervisor === sup.name);
        // Count of students assigned to this supervisor
        const assignedCount = allStudents.filter(stu => stu.supervisor === sup.name).length;
        html += `<div class="supervisor-assign-block" style="margin-bottom:32px;padding:0;background:#fff;border-radius:12px;box-shadow:0 2px 8px #33d99922;">
            <div class="supervisor-assign-header" data-supervisor-idx="${idx}" style="cursor:pointer;padding:18px 18px 12px 18px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:#1abc60;font-size:1.1rem;font-weight:600;">${sup.name} <span style='color:#888;font-size:0.98em;'>(${sup.email})</span> <span style='font-size:0.98em;color:#2196F3;'>&mdash; Assigned: <b>${assignedCount}</b></span></span>
                <span class="supervisor-assign-toggle" style="font-size:1.3em;color:#219a8b;transition:transform 0.2s;">&#x25BC;</span>
            </div>
            <div class="supervisor-assign-content" style="display:none;padding:0 18px 12px 18px;">
                <form class="assign-students-to-supervisor-form" data-dept-id="${dept.id}" data-supervisor-name="${sup.name}">
                    <table class="data-table" style="margin-bottom: 12px;">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Course</th>
                                <th>Current Supervisor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredStudents.length ? filteredStudents.map(stu => `
                                <tr>
                                    <td><input type="checkbox" name="studentIds" value="${stu.id}" ${stu.supervisor === sup.name ? 'checked' : ''}></td>
                                    <td>${stu.name}</td>
                                    <td>${stu.email}</td>
                                    <td>${stu.courseName}</td>
                                    <td>${stu.supervisor || 'Unassigned'}</td>
                                </tr>
                            `).join('') : `<tr><td colspan='5' style='color:#888;'>No unassigned students</td></tr>`}
                        </tbody>
                    </table>
                    <button type="submit" class="btn btn-primary">Assign Selected Students</button>
                </form>
            </div>
        </div>`;
    });
    container.innerHTML = html;

    // Attach collapse/expand event listeners
    container.querySelectorAll('.supervisor-assign-header').forEach(header => {
        header.addEventListener('click', function() {
            const idx = header.getAttribute('data-supervisor-idx');
            const content = container.querySelectorAll('.supervisor-assign-content')[idx];
            const toggle = header.querySelector('.supervisor-assign-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.style.transform = 'rotate(180deg)';
            } else {
                content.style.display = 'none';
                toggle.style.transform = 'rotate(0deg)';
            }
        });
    });

    // Attach event listeners for each form
    container.querySelectorAll('.assign-students-to-supervisor-form').forEach(form => {
        form.onsubmit = function(e) {
            e.preventDefault();
            const deptId = parseInt(form.getAttribute('data-dept-id'));
            const supervisorName = form.getAttribute('data-supervisor-name');
            const checked = Array.from(form.querySelectorAll('input[name="studentIds"]:checked')).map(cb => parseInt(cb.value));
            const dept = departments.find(d => d.id === deptId);
            if (!dept) return;
            // Assign selected students to this supervisor, unassign from all others
            dept.courses.forEach(course => {
                course.students.forEach(stu => {
                    if (checked.includes(stu.id)) {
                        stu.supervisor = supervisorName;
                        stu.status = 'active';
                        // Update global students array if present
                        const globalStudent = students.find(s => s.id === stu.id);
                        if (globalStudent) {
                            globalStudent.supervisor = supervisorName;
                            globalStudent.status = 'active';
                        }
                    } else if (stu.supervisor === supervisorName) {
                        // If unchecked and was assigned to this supervisor, unassign
                        stu.supervisor = '';
                        stu.status = 'pending';
                        const globalStudent = students.find(s => s.id === stu.id);
                        if (globalStudent) {
                            globalStudent.supervisor = '';
                            globalStudent.status = 'pending';
                        }
                    }
                });
            });
            // Enforce exclusivity: unassign these students from all other supervisors in this department
            dept.supervisors.forEach(otherSup => {
                if (otherSup.name !== supervisorName) {
                    dept.courses.forEach(course => {
                        course.students.forEach(stu => {
                            if (checked.includes(stu.id) && stu.supervisor === supervisorName) {
                                // Already assigned, skip
                                return;
                            }
                            if (checked.includes(stu.id) && stu.supervisor === otherSup.name) {
                                stu.supervisor = supervisorName;
                                stu.status = 'active';
                                const globalStudent = students.find(s => s.id === stu.id);
                                if (globalStudent) {
                                    globalStudent.supervisor = supervisorName;
                                    globalStudent.status = 'active';
                                }
                            }
                        });
                    });
                }
            });
            showNotification('Students assigned to supervisor!', 'success');
            renderAssignSupervisorsTable(deptId);
            if (typeof renderManageDepartmentsDetails === 'function') renderManageDepartmentsDetails(deptId);
            if (currentSection === 'students') loadStudents();
        };
    });
} 

// --- Internship Management Logic ---
function getInternships() {
    return JSON.parse(localStorage.getItem('internships') || '[]');
}
function saveInternships(list) {
    localStorage.setItem('internships', JSON.stringify(list));
}
function getManageInternships() {
    return JSON.parse(localStorage.getItem('manageInternships') || '[]');
}
function saveManageInternships(list) {
    localStorage.setItem('manageInternships', JSON.stringify(list));
}
function renderInternshipsTable() {
    const container = document.getElementById('internshipsTableContainer');
    const internships = getInternships();
    if (!container) return;
    if (!internships.length) {
        container.innerHTML = '<p style="color:#888;">No internships posted yet.</p>';
        return;
    }
    let html = `<table class="internship-table">
        <thead>
            <tr>
                <th>Title</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Interested Students</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${internships.map(i => `
                <tr>
                    <td>${i.title}</td>
                    <td>${i.deadline}</td>
                    <td><span class="status-badge status-${i.status}">${i.status.charAt(0).toUpperCase() + i.status.slice(1)}</span></td>
                    <td style="text-align:center; font-weight:600; color:#219a8b;">${i.studentsInterested || 0}</td>
                    <td>
                        <div class="internship-action-btns">
                            <button class="btn edit" onclick="editInternshipInstitution('${i.id}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn delete" onclick="deleteInternship('${i.id}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
    container.innerHTML = html;
}
function showInternshipModal(editId = null) {
    const modal = document.getElementById('internshipModal');
    const form = document.getElementById('internshipForm');
    document.getElementById('internshipModalTitle').textContent = editId ? 'Edit Internship' : 'Post Internship';
    // Do not reset form fields here to preserve values
    if (editId) {
        const internships = getInternships();
        const internship = internships.find(i => i.id === editId);
        if (internship) {
            form.internshipId.value = internship.id;
            form.title.value = internship.title;
            form.deadline.value = internship.deadline;
            form.status.value = internship.status;
            form.description.value = internship.description || '';
            form.requirements.value = internship.requirements || '';
            form.location.value = internship.location || '';
        }
    }
    renderInternshipsTable();
    modal.style.display = 'block';
}
function closeInternshipModal() {
    document.getElementById('internshipModal').style.display = 'none';
    // Do not reset form fields here
}
// The original onsubmit for the internship form was removed as per the edit hint.
// The handleInternshipFormSubmit function now handles the form submission.

function handleInternshipFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const internshipId = form.internshipId.value;
    const internships = getInternships();
    const manageInternships = getManageInternships();
    let internship = internships.find(i => i.id === internshipId);
    let manageIdx = manageInternships.findIndex(i => i.id === internshipId);

    if (internshipId) { // Editing existing internship
        if (internship) {
            internship.title = form.title.value;
            internship.deadline = form.deadline.value;
            internship.status = form.status.value;
            internship.description = form.description.value;
            internship.requirements = form.requirements.value;
            internship.location = form.location.value;
            // Update in manageInternships as well
            if (manageIdx > -1) {
                manageInternships[manageIdx] = { ...internship };
            }
            saveInternships(internships);
            saveManageInternships(manageInternships);
            showNotification('Internship updated!', 'success');
        } else {
            showNotification('Internship not found.', 'error');
        }
    } else { // Adding new internship
        const newInternship = {
            id: Date.now().toString() + Math.random().toString(36).substr(2,5),
            title: form.title.value,
            deadline: form.deadline.value,
            status: form.status.value,
            description: form.description.value,
            requirements: form.requirements.value,
            location: form.location.value,
            studentsInterested: 0
        };
        internships.push(newInternship);
        manageInternships.push(newInternship);
        saveInternships(internships);
        saveManageInternships(manageInternships);
        showNotification('Internship posted!', 'success');
    }
    closeInternshipModal();
    renderInternshipsTable();
    renderManageInternshipsTable();
    // Do not reset form fields here
}

function editInternshipInstitution(id) {
    showInternshipModal(id);
}
function deleteInternship(id) {
    if (confirm('Delete this internship?')) {
        let internships = getInternships();
        internships = internships.filter(i => i.id !== id);
        saveInternships(internships);
        renderInternshipsTable();
        showNotification('Internship deleted.', 'success');
    }
}
// Render internships on section navigation
const origNavigateToSection = navigateToSection;
navigateToSection = function(section) {
    origNavigateToSection(section);
    if (section === 'internships') {
        renderManageInternshipsTable();
        renderInternshipsTable();
    }
};
window.showInternshipModal = showInternshipModal;
window.closeInternshipModal = closeInternshipModal;
window.editInternshipInstitution = editInternshipInstitution;
window.deleteInternship = deleteInternship; 

function renderManageInternshipsTable() {
    const container = document.getElementById('manageInternshipsTableContainer');
    let internships = getManageInternships();
    // Add a mock interested student to the first internship for demo if not present
    if (internships.length && (!internships[0].interestedStudents || internships[0].interestedStudents.length === 0)) {
        internships[0].interestedStudents = [
            {
                id: 'stu1',
                name: 'Jane Doe',
                department: 'Computer Science',
                year: '3rd Year',
                email: 'jane.doe@example.com',
                status: 'Applied'
            },
            {
                id: 'stu2',
                name: 'John Smith',
                department: 'Information Technology',
                year: '2nd Year',
                email: 'john.smith@example.com',
                status: 'Applied'
            }
        ];
        internships[0].studentsInterested = 2;
        saveManageInternships(internships);
    }
    if (!container) return;
    if (!internships.length) {
        container.innerHTML = '<p style="color:#888;">No internships posted yet.</p>';
        return;
    }
    let html = `<table class="internship-table">
        <thead>
            <tr>
                <th>Title</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Interested Students</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${internships.map(i => `
                <tr>
                    <td>${i.title}</td>
                    <td>${i.deadline}</td>
                    <td><span class="status-badge status-${i.status}">${i.status.charAt(0).toUpperCase() + i.status.slice(1)}</span></td>
                    <td style="text-align:center; font-weight:600; color:#219a8b;">${i.studentsInterested || 0}</td>
                    <td>
                        <div class="internship-action-btns">
                            <button class="btn edit" onclick="editInternshipInstitution('${i.id}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn delete" onclick="deleteManageInternship('${i.id}')"><i class="fas fa-trash"></i> Delete</button>
                            <button class="btn view-students" onclick="showInterestedStudentsModal('${i.id}')"><i class="fas fa-users"></i> View Interested Students</button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
    container.innerHTML = html;
}
function deleteManageInternship(id) {
    let internships = getManageInternships();
    internships = internships.filter(i => i.id !== id);
    saveManageInternships(internships);
    // Also remove from main internships array for consistency
    let all = getInternships();
    all = all.filter(i => i.id !== id);
    saveInternships(all);
    renderManageInternshipsTable();
    showNotification('Internship deleted.', 'success');
} 

// --- Notifications Modal Logic ---
let adminInboxNotifications = JSON.parse(localStorage.getItem('adminInboxNotifications') || '[]');
let adminSentNotifications = JSON.parse(localStorage.getItem('adminSentNotifications') || '[]');

function saveAdminInboxNotifications(list) {
    adminInboxNotifications = list;
    localStorage.setItem('adminInboxNotifications', JSON.stringify(list));
}
function saveAdminSentNotifications(list) {
    adminSentNotifications = list;
    localStorage.setItem('adminSentNotifications', JSON.stringify(list));
}
function openNotificationsModal() {
    renderNotificationsTabs();
    document.getElementById('notificationsModal').style.display = 'block';
    markAllInboxNotificationsRead();
    updateNotificationBadge();
}
function closeNotificationsModal() {
    document.getElementById('notificationsModal').style.display = 'none';
}
function openComposeNotificationModal() {
    document.getElementById('composeNotificationModal').style.display = 'block';
}
function closeComposeNotificationModal() {
    document.getElementById('composeNotificationModal').style.display = 'none';
}
function renderNotificationsTabs() {
    // Tab switching
    const tabBtns = Array.from(document.querySelectorAll('.notifications-tab-btn'));
    const tabPanels = document.querySelectorAll('.notifications-tab-panel');
    tabBtns.forEach(btn => {
        btn.onclick = function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tab = this.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                panel.style.display = (panel.getAttribute('data-tab-panel') === tab) ? 'block' : 'none';
            });
        };
    });
    renderNotificationsInbox();
    renderNotificationsSent();
}
function renderNotificationsInbox() {
    const list = document.getElementById('notificationsInboxList');
    if (!list) return;
    if (!adminInboxNotifications.length) {
        list.innerHTML = '<p style="color:#888;">No notifications received.</p>';
        return;
    }
    list.innerHTML = adminInboxNotifications.slice().reverse().map((n, idx) => {
        const realIdx = adminInboxNotifications.length - 1 - idx;
        return `
        <div class="notification-item${n.unread ? ' unread' : ''}">
            <div style="flex:1;">
                <div>${n.message}</div>
                <div class="notification-meta">From: Supervisor &middot; ${n.time}
                ${n.replied ? '<span class=\'replied-badge\'>Replied</span>' : ''}
                </div>
            </div>
            <div>
                ${n.replied ? '' : `<button class='reply-btn' onclick='openReplyNotificationModal(${realIdx})'>Reply</button>`}
            </div>
        </div>
        `;
    }).join('');
}
function renderNotificationsSent() {
    const list = document.getElementById('notificationsSentList');
    if (!list) return;
    if (!adminSentNotifications.length) {
        list.innerHTML = '<p style="color:#888;">No notifications sent.</p>';
        return;
    }
    list.innerHTML = adminSentNotifications.slice().reverse().map(n => `
        <div class="notification-item">
            <div>${n.message}</div>
            <div class="notification-meta">To: All Supervisors &middot; ${n.time}</div>
        </div>
    `).join('');
}
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unread = adminInboxNotifications.filter(n => n.unread).length;
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}
function markAllInboxNotificationsRead() {
    let changed = false;
    adminInboxNotifications.forEach(n => {
        if (n.unread) { n.unread = false; changed = true; }
    });
    if (changed) saveAdminInboxNotifications(adminInboxNotifications);
}
// Compose Notification
const composeForm = document.getElementById('composeNotificationForm');
if (composeForm) {
    composeForm.onsubmit = function(e) {
        e.preventDefault();
        const msg = this.message.value.trim();
        if (!msg) return;
        const now = new Date();
        const notif = {
            message: msg,
            time: now.toLocaleString(),
            unread: false
        };
        adminSentNotifications.push(notif);
        saveAdminSentNotifications(adminSentNotifications);
        renderNotificationsSent();
        closeComposeNotificationModal();
        showNotification('Notification sent to all supervisors!', 'success');
    };
}
// Demo: Supervisor sends notification to admin
const testSupBtn = document.getElementById('testSupervisorNotificationBtn');
if (testSupBtn) {
    testSupBtn.onclick = function() {
        const now = new Date();
        const notif = {
            message: 'This is a test notification from a supervisor.',
            time: now.toLocaleString(),
            unread: true
        };
        adminInboxNotifications.push(notif);
        saveAdminInboxNotifications(adminInboxNotifications);
        renderNotificationsInbox();
        updateNotificationBadge();
        showNotification('Test notification received from supervisor!', 'info');
    };
}
// Bell icon opens modal
const bell = document.getElementById('notificationBell');
if (bell) {
    bell.onclick = function() {
        openNotificationsModal();
    };
}
// Compose button opens compose modal
const composeBtn = document.getElementById('composeNotificationBtn');
if (composeBtn) {
    composeBtn.onclick = function() {
        openComposeNotificationModal();
    };
}
// Modal close logic for notifications
window.closeNotificationsModal = closeNotificationsModal;
window.closeComposeNotificationModal = closeComposeNotificationModal;
// On page load, update badge
updateNotificationBadge(); 

// Reply modal logic
function openReplyNotificationModal(idx) {
    const modal = document.getElementById('replyNotificationModal');
    const form = document.getElementById('replyNotificationForm');
    form.replyToIndex.value = idx;
    form.replyMessage.value = '';
    modal.style.display = 'block';
}
function closeReplyNotificationModal() {
    document.getElementById('replyNotificationModal').style.display = 'none';
}
const replyForm = document.getElementById('replyNotificationForm');
if (replyForm) {
    replyForm.onsubmit = function(e) {
        e.preventDefault();
        const idx = parseInt(this.replyToIndex.value);
        const msg = this.replyMessage.value.trim();
        if (!msg || isNaN(idx)) return;
        // Mark notification as replied
        adminInboxNotifications[idx].replied = true;
        saveAdminInboxNotifications(adminInboxNotifications);
        // Save reply as sent notification
        const now = new Date();
        const notif = {
            message: msg,
            time: now.toLocaleString(),
            unread: false,
            replyTo: idx
        };
        adminSentNotifications.push(notif);
        saveAdminSentNotifications(adminSentNotifications);
        renderNotificationsInbox();
        renderNotificationsSent();
        closeReplyNotificationModal();
        showNotification('Reply sent to supervisor!', 'success');
    };
}
window.openReplyNotificationModal = openReplyNotificationModal;
window.closeReplyNotificationModal = closeReplyNotificationModal; 

// Modal logic for interested students
function showInterestedStudentsModal(internshipId) {
    const modal = document.getElementById('interestedStudentsModal');
    const content = document.getElementById('interestedStudentsModalContent');
    const internships = getManageInternships();
    const internship = internships.find(i => i.id === internshipId);
    if (!internship) return;
    const students = internship.interestedStudents || [];
    let html = `<h2 style='margin-bottom:18px;'>Interested Students for <span style='color:#219a8b;'>${internship.title}</span></h2>`;
    if (!students.length) {
        html += `<p style='color:#888;'>No students have shown interest yet.</p>`;
    } else {
        html += `<div class='students-list-modal' style='max-height:340px;overflow-y:auto;'>`;
        students.forEach(stu => {
            html += `<div class='student-card-modal'>
                <div class='student-info-modal'>
                    <div class='student-avatar-modal'><i class='fas fa-user-graduate'></i></div>
                    <div>
                        <div class='student-name-modal'>${stu.name}</div>
                        <div class='student-meta-modal'>${stu.department} &bull; ${stu.year || ''}</div>
                        <div class='student-email-modal'><a href='mailto:${stu.email}'>${stu.email}</a></div>
                    </div>
                </div>
                <div class='student-status-modal'><span class='status-badge status-${stu.status || 'applied'}'>${(stu.status || 'Applied').charAt(0).toUpperCase() + (stu.status || 'Applied').slice(1)}</span></div>
                <div class='student-actions-modal'>
                    <button class='btn btn-interview' onclick='considerForInterview("${internshipId}", "${stu.id}")' title='Consider for Interview'><i class='fas fa-comments'></i> Interview</button>
                    <button class='btn btn-offer' onclick='offerInternship("${internshipId}", "${stu.id}")' title='Offer Internship'><i class='fas fa-handshake'></i> Offer</button>
                    <button class='btn btn-reject' onclick='rejectStudent("${internshipId}", "${stu.id}")' title='Reject'><i class='fas fa-times'></i> Reject</button>
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    content.innerHTML = html;
    modal.style.display = 'block';
}
window.showInterestedStudentsModal = showInterestedStudentsModal;

function closeInterestedStudentsModal() {
    document.getElementById('interestedStudentsModal').style.display = 'none';
}
window.closeInterestedStudentsModal = closeInterestedStudentsModal;

// Action handlers
function considerForInterview(internshipId, studentId) {
    updateStudentStatus(internshipId, studentId, 'Interviewed');
}
function offerInternship(internshipId, studentId) {
    updateStudentStatus(internshipId, studentId, 'Offered');
}
function rejectStudent(internshipId, studentId) {
    updateStudentStatus(internshipId, studentId, 'Rejected');
}
function updateStudentStatus(internshipId, studentId, status) {
    const internships = getManageInternships();
    const idx = internships.findIndex(i => i.id === internshipId);
    if (idx === -1) return;
    const students = internships[idx].interestedStudents || [];
    const stuIdx = students.findIndex(s => s.id === studentId);
    if (stuIdx === -1) return;
    students[stuIdx].status = status;
    internships[idx].interestedStudents = students;
    saveManageInternships(internships);
    showInterestedStudentsModal(internshipId);
}
window.considerForInterview = considerForInterview;
window.offerInternship = offerInternship;
window.rejectStudent = rejectStudent; 