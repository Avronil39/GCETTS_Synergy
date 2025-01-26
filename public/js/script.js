// Function to fetch data from the backend and update the form and PDF viewer
const fetchData = async (pdfIndex = 0) => {
    try {
        // Fetching data from the backend
        const response = await fetch(`/data?pdfIndex=${pdfIndex}`);
        const data = await response.json();

        // Update form fields with the data from backend
        document.getElementById('name').value = data.name;
        document.getElementById('department').value = data.department;
        document.getElementById('semester').value = data.semester;
        document.getElementById('roll').value = data.roll;
        document.getElementById('subject').value = data.subject;

        // Update PDF viewer with the new PDF URL
        document.getElementById('pdfViewer').src = data.pdfUrl;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

// Variable to track the current PDF index
let currentPdfIndex = 0;

// Initial data fetch to load the first PDF
fetchData();

// Event listener for "Previous PDF" button
document.getElementById('prevPdf').addEventListener('click', () => {
    // Decrease the index and fetch previous PDF
    currentPdfIndex = Math.max(0, currentPdfIndex - 1);
    fetchData(currentPdfIndex);
});

// Event listener for "Next PDF" button
document.getElementById('nextPdf').addEventListener('click', () => {
    // Increase the index and fetch next PDF
    currentPdfIndex++;
    fetchData(currentPdfIndex);
});
