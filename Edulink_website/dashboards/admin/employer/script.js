// Simulated API Data
const fetchDashboardData = async () => {
    return {
      summary: {
        applicants: 10,
        interviews: 10,
        internships: 7
      },
      applications: [
        { name: "Angela", role: "Software Dev", date: "01/07/2025", duration: "3 Months", profile: "#"},
        { name: "Moh", role: "Design", date: "01/06/2025", duration: "Unknown", profile: "#"}
      ],
      internships: [
        { name: "Mike", role: "DevOps", from: "04/03/25", to: "04/07/25" },
        { name: "Domnie", role: "Marketing", from: "03/04/25", to: "03/07/25" }
      ]
    };
  };
  
  // Render summary cards
  const renderSummaryCards = (summary) => {
    const container = document.getElementById("summaryCards");
    container.innerHTML = `
      <div class="bg-white p-4 shadow rounded">
        <h2 class="text-gray-500">New Applicants</h2>
        <p class="text-2xl font-bold">${summary.applicants}</p>
      </div>
      <div class="bg-white p-4 shadow rounded">
        <h2 class="text-gray-500">Upcoming Interviews</h2>
        <p class="text-2xl font-bold">${summary.interviews}</p>
      </div>
      <div class="bg-white p-4 shadow rounded">
        <h2 class="text-gray-500">Available Internships</h2>
        <p class="text-2xl font-bold">${summary.internships}</p>
      </div>
    `;
  };
  
  // Render Applications
  const renderApplicationsTable = (applications) => {
    const table = document.getElementById("applicationsTable");
    table.innerHTML = `
      <thead>
        <tr class="bg-gray-100">
          <th class="p-2">Name</th>
          <th>Role</th>
          <th>Profile</th>
          <th>Date</th>
          <th>Duration</th>
          <th>Accept</th>
          <th>Decline</th>
        </tr>
      </thead>
      <tbody>
        ${applications.map(app => `
          <tr class="border-t">
            <td class="p-2">${app.name}</td>
            <td>${app.role}</td>
            <td><a href="${app.profile}" class="text-blue-500">View Profile</a></td>
            <td>${app.date}</td>
            <td>${app.duration}</td>
            <td><button class="bg-green-500 text-white px-2 py-1 rounded">Intern</button></td>
            <td><button class="bg-red-500 text-white px-2 py-1 rounded">Decline</button></td>
          </tr>
        `).join("")}
      </tbody>
    `;
  };
  
  // Render Internships
  const renderInternshipsTable = (interns) => {
    const table = document.getElementById("internshipsTable");
    table.innerHTML = `
      <thead>
        <tr class="bg-gray-100">
          <th class="p-2">Name</th>
          <th>Role</th>
          <th>From</th>
          <th>To</th>
          <th>Progress</th>
          <th>Rate</th>
          <th>Certify</th>
        </tr>
      </thead>
      <tbody>
        ${interns.map(i => `
          <tr class="border-t">
            <td class="p-2">${i.name}</td>
            <td>${i.role}</td>
            <td>${i.from}</td>
            <td>${i.to}</td>
            <td><button class="bg-blue-500 text-white px-2 py-1 rounded">View</button></td>
                    ]            <td><button class="bg-yellow-500 text-white px-2 py-1 rounded">Rate</button></td>
            <td><button class="bg-green-600 text-white px-2 py-1 rounded">Certify</button></td>
          </tr>
        `).join("")}
      </tbody>
    `;
  };
  
  // Initialize Dashboard
  const initDashboard = async () => {
    const data = await fetchDashboardData();
    renderSummaryCards(data.summary);
    renderApplicationsTable(data.applications);
    renderInternshipsTable(data.internships);
  };
  
  document.addEventListener("DOMContentLoaded", initDashboard);