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
      <div class="bg-white p-4 shadow rounded">
        <h2 class="text-gray-500">Assigned Interns</h2>
        <p class="text-2xl font-bold">${summary.assignedInterns}</p>
      </div>
      <div class="bg-white p-4 shadow rounded">
        <h2 class="text-gray-500">Pending Logbooks</h2>
        <p class="text-2xl font-bold">${summary.pendingLogbooks}</p>
      </div>
      <div class="bg-white p-4 shadow rounded">
        <h2 class="text-gray-500">Feedback Requests</h2>
        <p class="text-2xl font-bold">${summary.feedbackRequests}</p>
      </div>
    `;
  };
  
  const renderAssignedInternsTable = (interns) => {
    const table = document.getElementById("internsTable");
    if (!table) return;
    table.innerHTML = `
      <thead>
        <tr class="bg-gray-100">
          <th class="p-2">Name</th>
          <th>Role</th>
          <th>From</th>
          <th>To</th>
          <th>Progress</th>
          <th>Profile</th>
        </tr>
      </thead>
      <tbody>
        ${interns.map(i => `
          <tr class="border-t">
            <td class="p-2">${i.name}</td>
            <td>${i.role}</td>
            <td>${i.from}</td>
            <td>${i.to}</td>
            <td>${i.progress}</td>
            <td><a href="${i.profile}" class="text-blue-500">View</a></td>
          </tr>
        `).join("")}
      </tbody>
    `;
  };
  
  const renderLogbookTable = (logbooks) => {
    const table = document.getElementById("logbookTable");
    if (!table) return;
    table.innerHTML = `
      <thead>
        <tr class="bg-gray-100">
          <th class="p-2">Intern</th>
          <th>Week</th>
          <th>Status</th>
          <th>Submitted</th>
          <th>View</th>
        </tr>
      </thead>
      <tbody>
        ${logbooks.map(l => `
          <tr class="border-t">
            <td class="p-2">${l.intern}</td>
            <td>${l.week}</td>
            <td>${l.status}</td>
            <td>${l.submitted}</td>
            <td><a href="${l.view}" class="text-blue-500">View</a></td>
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