document.addEventListener('DOMContentLoaded', async () => {
    // Render the basic layout (sidebar and main content area)
    // This function is assumed to be in utils.js
    renderAppShell('บันทึกงานประจำวัน');

    const loadingOverlay = document.getElementById('loading-overlay');
    const mainContent = document.getElementById('main-content');

    // --- Main Logic ---
    // Check if we are in "edit" mode
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdToEdit = urlParams.get('edit');

    if (groupIdToEdit) {
        // We are in edit mode, load the existing data
        document.title = 'แก้ไขใบงาน | ระบบคิดค่าแรงคนงาน';
        await loadLogForEdit(groupIdToEdit);
    } else {
        // We are in "create new" mode
        // Render the empty form
        renderForm();
    }

    // --- Function Definitions ---

    /**
     * Fetches log group data from the API and populates the form.
     * @param {string} groupId The GroupID of the log to fetch.
     */
    async function loadLogForEdit(groupId) {
        try {
            // 1. Show the loading indicator
            loadingOverlay.style.display = 'flex';

            // 2. Call the API to get the log group data
            // This function is assumed to be in api.js
            const response = await callApi('getLogGroup', { groupId });

            if (response.success && response.data) {
                // 3. Render the form and populate it with the fetched data
                renderForm(response.data);
            } else {
                throw new Error(response.message || 'ไม่พบข้อมูลใบงาน');
            }

        } catch (error) {
            console.error('Failed to load log data:', error);
            // This function is assumed to be in utils.js
            renderError(mainContent, 'เกิดข้อผิดพลาดในการดึงข้อมูลใบงาน', () => loadLogForEdit(groupId));
        } finally {
            // 4. Always hide the loading indicator
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Renders the form for creating or editing a log.
     * @param {object} [logData] - Optional data for populating the form in edit mode.
     */
    function renderForm(logData = null) {
        // Placeholder for your actual form rendering logic
        mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-2xl font-semibold mb-4">${logData ? 'แก้ไขใบงาน' : 'สร้างใบงานใหม่'}</h2>
                <!-- Your form fields (date, site, workers, etc.) would go here -->
                <p>Form fields will be populated here.</p>
                ${logData ? `<pre class="mt-4 bg-gray-100 p-2 rounded text-sm">${JSON.stringify(logData, null, 2)}</pre>` : ''}
            </div>
        `;
        // TODO: Implement the full form rendering and data population logic.
        // TODO: Add event listeners for form submission (addLogs or updateLogGroup).
    }
});