const logoutButton = document.getElementById("logoutBtn");
const faculty_name = document.getElementById("faculty_name");
const student_name = document.getElementById("student_name");
const student_department = document.getElementById("student_department");
const student_semester = document.getElementById("student_semester");
const student_roll = document.getElementById("student_roll");
const student_subject = document.getElementById("student_subject");
const prev_pdf_btn = document.getElementById("prev_pdf_btn");
const next_pdf_btn = document.getElementById("next_pdf_btn");
const pdf_viewer = document.getElementById("pdf_viewer");

logoutButton.addEventListener("click", async () => {
    // alert("Logging out"); // for debugging
    try {
        const response = await axios.post('/logout');
        window.location.href = "/login";
    }
    catch (error) {
        console.log("error while logging out ", error);
    }
})
prev_pdf_btn.addEventListener("click", async () => {
    const res = await axios.post(`/button/prev`);
    console.log(res.data);
    // console.log(res.data.student_roll);
    updateFields(res.data);
    fetchPDF();

})
next_pdf_btn.addEventListener("click", async () => {
    const res = await axios.post(`/button/next`);
    console.log(res.data);
    // console.log(res.data.student_department);
    updateFields(res.data);
    fetchPDF();
})

console.log("faculty.js is working now ");
// fetchPDF();

function fetchPDF() {
    axios.get('/getPdf', { responseType: 'blob' }) // Expect binary data
        .then(response => {
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            pdf_viewer.src = url;
        })
        .catch(error => console.error("Error fetching PDF:", error));
}

function updateFields(data) {
    student_name.value = data.student_name;
    student_department.value = data.student_department;
    student_semester.value = data.student_semester;
    student_roll.value = data.student_roll;
    student_subject.value = data.student_subject;
}