var field = document.getElementById('field_robot');

field.addEventListener('input', function() {
  var val = document.getElementById('field_robot').value;
  if (val != '42') {
    field.setCustomValidity('invalid');
  } else {
    event.target.setCustomValidity('');
  }
});