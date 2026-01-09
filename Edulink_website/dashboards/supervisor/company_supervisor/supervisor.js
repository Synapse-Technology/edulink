// ... existing code ...
// Supervisor-specific mock data
const fetchSupervisorDashboardData = async () => {
    return {
      summary: {
        assignedInterns: 5,
        pendingLogbooks: 3,
        feedbackRequests: 2
      },
      interns: [
        { name: "Alice", role: "Software Intern", from: "01/06/25", to: "01/09/25", progress: "6/12 weeks", profile: "#" },
        { name: "Brian", role: "Marketing Intern", from: "02/06/25", to: "02/09/25", progress: "4/12 weeks", profile: "#" }
      ],
      logbooks: [
        { intern: "Alice", week: 6, status: "Pending", submitted: "10/07/25", view: "#" },
        { intern: "Brian", week: 4, status: "Reviewed", submitted: "08/07/25", view: "#" }
      ]
    };
  };
  
  const renderSupervisorSummaryCards = (summary) => {
    const container = document.getElementById("summaryCards");
    if (!container) return;
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-lg card-hover border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm font-medium mb-1">Total Interns</p>
            <p class="text-3xl font-bold text-gray-800">${summary.assignedInterns}</p>
            <p class="text-green-600 text-sm font-medium mt-2">
              <i class="fas fa-arrow-up mr-1"></i>+2 this month
            </p>
          </div>
          <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-users text-white"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-2xl p-6 shadow-lg card-hover border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm font-medium mb-1">Pending Logbooks</p>
            <p class="text-3xl font-bold text-gray-800">${summary.pendingLogbooks}</p>
            <p class="text-orange-600 text-sm font-medium mt-2">
              <i class="fas fa-clock mr-1"></i>3 due today
            </p>
          </div>
          <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <i class="fas fa-book text-white"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-2xl p-6 shadow-lg card-hover border border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm font-medium mb-1">Feedback Requests</p>
            <p class="text-3xl font-bold text-gray-800">${summary.feedbackRequests}</p>
            <p class="text-blue-600 text-sm font-medium mt-2">
              <i class="fas fa-comment-dots mr-1"></i>2 new requests
            </p>
          </div>
          <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
            <i class="fas fa-chart-line text-white"></i>
          </div>
        </div>
      </div>
    `;
  };
  
  const renderAssignedInternsTable = (interns) => {
    const table = document.getElementById("internsTable");
    if (!table) return;
    table.innerHTML = `
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Intern</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        ${interns.map(i => `
          <tr class="hover:bg-gray-50 transition-colors duration-200">
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                  <span class="text-white font-semibold text-sm">${i.name.charAt(0)}</span>
                </div>
                <div>
                  <div class="text-sm font-semibold text-gray-900">${i.name}</div>
                  <div class="text-sm text-gray-500">ID: INT-${Math.floor(Math.random() * 1000)}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                ${i.role}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              <div>${i.from} - ${i.to}</div>
              <div class="text-xs text-gray-500">12 weeks total</div>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="w-full bg-gray-200 rounded-full h-2 mr-2">
                  <div class="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full" style="width: ${(parseInt(i.progress.split('/')[0]) / parseInt(i.progress.split('/')[1])) * 100}%"></div>
                </div>
                <span class="text-sm font-medium text-gray-700">${i.progress}</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i class="fas fa-circle text-green-400 mr-1" style="font-size: 6px;"></i>
                Active
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
                <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200" title="View Profile">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200" title="Send Message">
                  <i class="fas fa-message"></i>
                </button>
                <button class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200" title="View Reports">
                  <i class="fas fa-chart-bar"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    `;
  };
  
  const renderLogbookTable = (logbooks) => {
    const table = document.getElementById("logbookTable");
    if (!table) return;
    
    const getStatusBadge = (status) => {
      const statusClasses = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Reviewed': 'bg-blue-100 text-blue-800',
        'Approved': 'bg-green-100 text-green-800',
        'Rejected': 'bg-red-100 text-red-800'
      };
      const iconClasses = {
        'Pending': 'fas fa-clock',
        'Reviewed': 'fas fa-eye',
        'Approved': 'fas fa-check-circle',
        'Rejected': 'fas fa-times-circle'
      };
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}">
        <i class="${iconClasses[status] || 'fas fa-circle'} mr-1" style="font-size: 8px;"></i>
        ${status}
      </span>`;
    };
    
    table.innerHTML = `
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Intern</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Week</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
          <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        ${logbooks.map(l => `
          <tr class="hover:bg-gray-50 transition-colors duration-200">
            <td class="px-6 py-4">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span class="text-white font-semibold text-sm">${l.intern.charAt(0)}</span>
                </div>
                <div>
                  <div class="text-sm font-semibold text-gray-900">${l.intern}</div>
                  <div class="text-sm text-gray-500">Logbook Entry</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-semibold text-gray-900">Week ${l.week}</div>
              <div class="text-xs text-gray-500">of 12 weeks</div>
            </td>
            <td class="px-6 py-4">
              ${getStatusBadge(l.status)}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              <div>${l.submitted}</div>
              <div class="text-xs text-gray-500">${Math.floor(Math.random() * 5) + 1} days ago</div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${l.status === 'Pending' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                ${l.status === 'Pending' ? 'High' : 'Normal'}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
                <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200" title="View Logbook">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200" title="Approve">
                  <i class="fas fa-check"></i>
                </button>
                <button class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200" title="Request Changes">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200" title="Download">
                  <i class="fas fa-download"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    `;
  };
  
  const initSupervisorDashboard = async () => {
    const data = await fetchSupervisorDashboardData();
    renderSupervisorSummaryCards(data.summary);
    renderAssignedInternsTable(data.interns);
    renderLogbookTable(data.logbooks);
  };
  
  // Only run supervisor dashboard logic if on supervisor.html
  if (window.location.pathname.endsWith("supervisor.html")) {
    document.addEventListener("DOMContentLoaded", initSupervisorDashboard);
  }
  // ... existing code ...