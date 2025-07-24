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
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
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
                { id: 2, name: 'Prof. Ochieng', email: 'ochieng@institution.edu', password: 'pass456' }
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
                                    ${course.students.length ? course.students.map(stu => `<li>${stu.name} (${stu.email})</li>`).join('') : '<li>No students</li>'}
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
    Array.from(form.querySelectorAll('#coursesList input[name^="courseName"]')).forEach(input => {
        if (input.value.trim()) courses.push({ id: Date.now() + Math.random(), name: input.value.trim(), students: [] });
    });
    // Gather supervisors
    const supervisors = [];
    Array.from(form.querySelectorAll('#supervisorsList .supervisor-input-row')).forEach(row => {
        const n = row.querySelector('input[name^="supervisorName"]').value.trim();
        const e = row.querySelector('input[name^="supervisorEmail"]').value.trim();
        const p = row.querySelector('input[name^="supervisorPassword"]').value.trim();
        if (n && e && p) supervisors.push({ id: Date.now() + Math.random(), name: n, email: e, password: p });
    });
    departments.push({ id: Date.now(), name, courses, supervisors });
    document.getElementById('addDepartmentModal').style.display = 'none';
    form.reset();
    document.getElementById('coursesList').innerHTML = '';
    document.getElementById('supervisorsList').innerHTML = '';
    loadDepartments();
    showNotification('Department added!', 'success');
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
        password: formData.get('password') // Assuming password is in formData
    };
    dept.supervisors.push(newSupervisor);
    document.getElementById('addSupervisorModal').style.display = 'none';
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
    document.getElementById('addCourseModal').style.display = 'none';
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
        document.getElementById('editDepartmentModal').style.display = 'none';
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
document.getElementById('addSupervisorForm').department.innerHTML = '';
function updateSupervisorDepartmentDropdown() {
    const select = document.getElementById('addSupervisorForm').department;
    select.innerHTML = '<option value="">Select Department</option>' +
        departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
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
        showNotification('Supervisor assigned!', 'success');
        // Re-render department details to reflect the change
        renderDepartmentDetails(deptId);
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
                        }
                    });
                }
            });
            showNotification('Supervisor assignments saved!', 'success');
            renderDepartmentDetails(deptId);
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
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
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
            if (window.innerWidth <= 768) {
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
    container.innerHTML = `
        <form class='bulk-assign-supervisors-form' data-dept-id='${dept.id}'>
        <table class='data-table' style='margin-bottom: 12px;'>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Course</th>
                    <th>Current Supervisor</th>
                    <th>Assign Supervisor</th>
                </tr>
            </thead>
            <tbody>
                ${allStudents.map(stu => `
                    <tr>
                        <td>${stu.name}</td>
                        <td>${stu.email}</td>
                        <td>${stu.courseName}</td>
                        <td>${stu.supervisor || 'Unassigned'}</td>
                        <td>
                            <select name='supervisor_${stu.id}' class='assign-supervisor-dropdown' data-student-id='${stu.id}' data-course-name='${stu.courseName}'>
                                <option value=''>Select Supervisor</option>
                                ${dept.supervisors.map(sup => `<option value='${sup.name}' ${stu.supervisor===sup.name?'selected':''}>${sup.name}</option>`).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <button type='submit' class='btn btn-primary btn-save-bulk-assign' style='font-size:0.98em;'>Save All Assignments</button>
        </form>
    `;
} 