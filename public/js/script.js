// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

// Auto-dismiss success/error flash alerts after exactly 5 seconds
document.addEventListener("DOMContentLoaded", () => {
  const alerts = document.querySelectorAll('.custom-alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      alert.style.opacity = "0";
      alert.style.transform = "translateY(-10px)";
      setTimeout(() => {
        alert.remove();
      }, 600);
    }, 5000);
  });
});