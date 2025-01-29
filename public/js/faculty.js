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
