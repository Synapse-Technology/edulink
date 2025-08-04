document.addEventListener("DOMContentLoaded", function() {
    // Fetch and inject the sidebar
    fetch('_sidebar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load sidebar');
            }
            return response.text();
        })
        .then(data => {
            const sidebarContainer = document.getElementById('sidebar-container');
            if (sidebarContainer) {
                sidebarContainer.innerHTML = data;
                
                // Highlight the current page link
                const currentPage = window.location.pathname.split('/').pop() || 'supervisor.html';
                const links = document.querySelectorAll('#sidebar-container a');
                
                links.forEach(link => {
                    if (link.getAttribute('href') === currentPage) {
                        link.classList.add('bg-teal-700', 'text-white');
                    }
                });

                // Add click event listeners to all links
                links.forEach(link => {
                    link.addEventListener('click', function(e) {
                        // Remove highlight from all links
                        links.forEach(l => {
                            l.classList.remove('bg-teal-700', 'text-white');
                        });
                        // Add highlight to clicked link
                        this.classList.add('bg-teal-700', 'text-white');
                    });
                });
            }
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            document.getElementById('sidebar-container').innerHTML = `
                <aside class="fixed left-0 top-0 w-64 bg-teal-500 p-4 border-r overflow-y-auto flex flex-col h-screen">
                    <div class="text-2xl font-bold mb-4">Supervisor Panel</div>
                    <nav class="space-y-2">
                        <a href="supervisor.html" class="block text-gray-700 hover:text-blue-600">Dashboard</a>
                        <a href="assigned_interns.html" class="block text-gray-700 hover:text-blue-600">Assigned Interns</a>
                        <a href="feedback.html" class="block text-gray-700 hover:text-blue-600">Feedback</a>
                        <a href="messages.html" class="block text-gray-700 hover:text-blue-600">Messages</a>
                    </nav>
                    <div class="flex-grow"></div>
                    <div class="text-sm text-blue-600">
                        <a href="settings.html" class="block">Settings</a>
                        <a href="help.html" class="block">Help Center</a>
                    </div>
                </aside>
            `;
        });
}); 